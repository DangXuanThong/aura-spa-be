import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from 'src/modules/service/entities/service.entity';
import { ServiceStatus } from 'src/modules/service/enums/service-status.enum';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { HealthRecord } from 'src/modules/health/entities/health-record.entity';
import { OpenAiService } from '../openai.service';
import { PROMPTS } from '../prompt.registry';
import { clampText, redactPii } from '../pii-redactor';
import { RecommendItemDto, RecommendServicesDto, RecommendServicesResponseDto } from '../dto/recommend-services.dto';

const DISCLAIMER = 'Gợi ý mang tính tham khảo, không thay thế tư vấn chuyên viên Aura Spa.';

/** Categories blocked when contraindication mentions deep massage / strong pressure. */
const MASSAGE_CATEGORIES = new Set(['Massage', 'Body']);

const GENERIC_REASONS = new Set([
  'phù hợp nhu cầu của bạn',
  'phù hợp với nhu cầu của bạn',
  'phù hợp nhu cầu bạn vừa mô tả',
  'khớp với nhu cầu bạn vừa mô tả',
  'phù hợp thực đơn đang hoạt động tại aura spa',
]);

@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);

  constructor(
    private readonly openAi: OpenAiService,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity)
    private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(HealthRecord) private readonly healthRepo: Repository<HealthRecord>,
  ) {}

  async recommend(dto: RecommendServicesDto, userId?: string | null): Promise<RecommendServicesResponseDto> {
    const needRaw = (dto.needText ?? '').trim();
    const need = needRaw.toLowerCase();
    const blankNeed = needRaw.length === 0;

    // Weird / nonsense query → empty state (do not pad catalog)
    if (this.isWeirdQuery(needRaw)) {
      return {
        recommendations: [],
        meta: {
          source: 'heuristic',
          personalized: false,
          healthFiltered: false,
          disclaimer: DISCLAIMER,
          emptyReason:
            'Chưa hiểu rõ nhu cầu này trong thực đơn Aura Spa. Thử mô tả ngắn (ví dụ: facial cấp ẩm, massage thư giãn) hoặc xem menu đầy đủ.',
        },
      };
    }

    const catalog = await this.serviceRepo.find({
      where: { status: ServiceStatus.Active },
      order: { name: 'ASC' },
    });

    const health = userId ? await this.loadSafeHealth(userId) : null;
    const history = userId ? await this.loadHistorySummary(userId) : [];
    const personalized = Boolean(userId) && history.length > 0;

    let filtered = catalog;
    let healthFiltered = false;
    const askedMassage = /massage|body|xoa bóp|trị liệu toàn thân/.test(need) && !/facial|da mặt|skincare|cấp ẩm/.test(need);

    if (health?.blockDeepMassage) {
      filtered = catalog.filter((s) => !MASSAGE_CATEGORIES.has(s.category ?? ''));
      healthFiltered = filtered.length < catalog.length;
    }

    if (dto.budgetMax != null) {
      filtered = filtered.filter((s) => Number(s.defaultPrice) <= dto.budgetMax!);
    }
    if (dto.preferredDuration != null) {
      filtered = filtered.filter((s) => Math.abs(s.defaultDurationMinutes - dto.preferredDuration!) <= 30);
    }

    if (filtered.length === 0) {
      return {
        recommendations: [],
        meta: {
          source: 'heuristic',
          personalized,
          healthFiltered,
          disclaimer: DISCLAIMER,
          emptyReason: healthFiltered
            ? 'Không còn dịch vụ phù hợp sau khi điều chỉnh theo hồ sơ chăm sóc. Xem menu hoặc chat tư vấn viên.'
            : 'Không có dịch vụ phù hợp với bộ lọc hiện tại. Thử nới ngân sách hoặc xem menu đầy đủ.',
        },
      };
    }

    // Blank need → popular/default list with honest copy (not "phù hợp nhu cầu")
    if (blankNeed) {
      const popular = this.pickPopular(filtered, history).map((s) =>
        this.toItem(
          s,
          0.72,
          personalized ? this.buildConcreteReasons(s, history, health, '', healthFiltered) : ['Gợi ý phổ biến đang được quan tâm tại Aura Spa'],
          healthFiltered ? ['Đã loại trừ liệu pháp massage/body theo hồ sơ chăm sóc'] : [],
          dto.branchId,
          personalized || blankNeed,
        ),
      );
      return {
        recommendations: popular.slice(0, 3),
        meta: {
          source: 'heuristic',
          personalized,
          healthFiltered,
          disclaimer: DISCLAIMER,
        },
      };
    }

    let items: RecommendItemDto[];
    let source: 'openai' | 'heuristic' = 'heuristic';

    if (this.openAi.isConfigured()) {
      try {
        items = await this.recommendWithOpenAi(filtered, dto, history, health, userId);
        source = 'openai';
      } catch (err) {
        this.logger.warn(`OpenAI recommend failed, using heuristic: ${err instanceof Error ? err.message : err}`);
        items = this.heuristicRecommend(filtered, dto, history, health, healthFiltered);
      }
    } else {
      items = this.heuristicRecommend(filtered, dto, history, health, healthFiltered);
    }

    const byId = new Map(filtered.map((s) => [s.id, s]));
    let safe: RecommendItemDto[] = [];
    for (const item of items.slice(0, 3)) {
      const svc = byId.get(item.serviceId);
      if (!svc) continue;
      const caveats = [...(item.caveats ?? [])];
      if (healthFiltered) {
        caveats.push('Đã loại trừ liệu pháp massage/body theo hồ sơ chăm sóc');
      }
      const reasons = this.ensureConcreteReasons(item.reasons, svc, history, health, needRaw, healthFiltered, personalized, blankNeed, askedMassage);
      safe.push(this.toItem(svc, this.capScore(item.score), reasons, caveats, dto.branchId, personalized || blankNeed));
    }

    // Safe alternatives when health filter emptied model results
    if (safe.length === 0 && filtered.length > 0 && healthFiltered) {
      safe = this.heuristicRecommend(filtered, { ...dto, needText: needRaw || 'chăm sóc da thư giãn nhẹ' }, history, health, true).map((item) => ({
        ...item,
        reasons: this.ensureConcreteReasons(
          item.reasons,
          byId.get(item.serviceId)!,
          history,
          health,
          needRaw,
          true,
          personalized,
          false,
          askedMassage,
        ),
        caveats: ['Đã loại trừ liệu pháp massage/body theo hồ sơ chăm sóc'],
        score: this.capScore(item.score),
      }));
      source = 'heuristic';
    } else if (safe.length === 0 && items.length > 0) {
      safe = this.heuristicRecommend(filtered, dto, history, health, healthFiltered);
      source = 'heuristic';
    }

    // Low relevance vs catalog after scoring → treat as empty-ish
    if (safe.length > 0 && !healthFiltered && this.isLowRelevanceNeed(need, safe)) {
      return {
        recommendations: [],
        meta: {
          source: 'heuristic',
          personalized,
          healthFiltered,
          disclaimer: DISCLAIMER,
          emptyReason: 'Chưa tìm thấy dịch vụ khớp mô tả. Thử từ khóa như “facial”, “massage”, “liệu trình” hoặc xem menu.',
        },
      };
    }

    return {
      recommendations: safe.slice(0, 3),
      meta: {
        source,
        personalized,
        healthFiltered,
        disclaimer: DISCLAIMER,
        emptyReason:
          safe.length === 0
            ? healthFiltered
              ? 'Không còn dịch vụ phù hợp sau khi điều chỉnh theo hồ sơ chăm sóc. Xem menu hoặc chat tư vấn viên.'
              : 'Chưa tìm thấy gợi ý phù hợp. Thử mô tả khác hoặc xem menu dịch vụ.'
            : undefined,
      },
    };
  }

  /** Nonsense / off-menu queries that should not pad the catalog. */
  private isWeirdQuery(needRaw: string): boolean {
    const t = needRaw.trim().toLowerCase();
    if (!t) return false;
    if (t.length > 8 && !/[a-zăâêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵđ\s]/i.test(t.replace(/[0-9]/g, ''))) {
      return true;
    }
    // gibberish / sci-fi / known test patterns
    if (/vũ trụ|xyz|không tồn tại|asdf|qwerty|lorem ipsum|random123|99999|foo bar|testtest|@@@|###/.test(t)) {
      return true;
    }
    // mostly digits / symbols
    const letters = (t.match(/[a-zăâêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵđ]/gi) || []).length;
    return t.length >= 6 && letters < 3;
  }

  private isLowRelevanceNeed(need: string, items: RecommendItemDto[]): boolean {
    if (!need || need.length < 4) return false;
    const tokens = need.split(/\s+/).filter((t) => t.length > 3);
    if (tokens.length === 0) return false;
    // spa domain tokens → not low relevance
    if (/spa|facial|massage|da|nail|body|liệu|trẻ hóa|thư giãn|cấp ẩm|móng|gói/.test(need)) {
      return false;
    }
    // if none of reasons mention match and scores all low
    const maxScore = Math.max(...items.map((i) => i.score));
    return maxScore < 0.55;
  }

  private isGenericReason(r: string): boolean {
    return GENERIC_REASONS.has(r.trim().toLowerCase());
  }

  private ensureConcreteReasons(
    raw: string[] | undefined,
    svc: Service,
    history: Array<{ name: string; category: string | null }>,
    health: { skinType: string | null; blockDeepMassage: boolean } | null,
    needRaw: string,
    healthFiltered: boolean,
    personalized: boolean,
    blankNeed: boolean,
    askedMassage: boolean,
  ): string[] {
    const cleaned = (raw ?? [])
      .map(String)
      .filter((r) => r.trim() && !this.isGenericReason(r))
      .slice(0, 2);
    if (cleaned.length >= 1 && !personalized && !healthFiltered) {
      return cleaned.slice(0, 2);
    }
    const built = this.buildConcreteReasons(svc, history, health, needRaw, healthFiltered, askedMassage, blankNeed);
    // Prefer concrete built reasons when personalized or health-filtered
    if (personalized || healthFiltered || blankNeed) {
      const merged = [...built];
      for (const c of cleaned) {
        if (!merged.some((m) => m.toLowerCase() === c.toLowerCase())) merged.push(c);
      }
      return merged.slice(0, 2);
    }
    return cleaned.length ? cleaned.slice(0, 2) : built.slice(0, 2);
  }

  private buildConcreteReasons(
    svc: Service,
    history: Array<{ name: string; category: string | null }>,
    health: { skinType: string | null; blockDeepMassage: boolean } | null,
    needRaw: string,
    healthFiltered: boolean,
    askedMassage = false,
    blankNeed = false,
  ): string[] {
    const reasons: string[] = [];
    const cat = svc.category ?? '';
    const need = needRaw.toLowerCase();

    if (healthFiltered && askedMassage) {
      reasons.push('Bạn yêu cầu massage/body — hệ thống đã chuyển sang gợi ý an toàn hơn');
    } else if (healthFiltered) {
      reasons.push('Đã điều chỉnh gợi ý theo hồ sơ chăm sóc (một số liệu pháp body/massage không được đề xuất)');
    }

    const histMatch = history.find((h) => h.name === svc.name || (h.category && h.category === cat));
    if (histMatch) {
      if (histMatch.name === svc.name) {
        reasons.push(`Bạn từng trải nghiệm “${svc.name.slice(0, 40)}”`);
      } else {
        reasons.push(`Bạn từng ưa thích nhóm ${cat || 'dịch vụ tương tự'}`);
      }
    }

    if (health?.skinType && /facial|skincare|treatment/i.test(cat)) {
      reasons.push(`Phù hợp với loại da ${health.skinType} trên hồ sơ chăm sóc`);
    }

    if (svc.isMultiSession || (svc.totalSessions ?? 0) > 1) {
      if (/liệu trình|nhiều buổi|multi|course/.test(need)) {
        reasons.push(`Liệu trình ${svc.totalSessions ?? 'nhiều'} buổi — phù hợp chăm sóc theo hành trình`);
      } else if (!reasons.some((r) => r.includes('Liệu trình'))) {
        reasons.push('Có gói nhiều buổi để theo dõi tiến trình');
      }
    }

    if (need && !blankNeed) {
      if (/cấp ẩm|dưỡng ẩm|da khô|hydration/.test(need) && /ẩm|radiance|hydration|facial/i.test(svc.name + (svc.description ?? ''))) {
        reasons.push('Khớp nhu cầu cấp ẩm / phục hồi da bạn vừa nêu');
      } else if (/thư giãn|stress|căng|mỏi/.test(need) && /massage|body|serenity|thư giãn/i.test(cat + svc.name)) {
        reasons.push('Hướng tới thư giãn và giảm căng thẳng');
      } else if (/trẻ hóa|anti.?age|lão hóa/.test(need)) {
        reasons.push('Hướng tới trẻ hóa / tái tạo da theo mô tả của bạn');
      }
    }

    if (blankNeed) {
      reasons.push(history.length ? 'Gợi ý phổ biến, ưu tiên nhóm bạn hay dùng' : 'Gợi ý phổ biến đang được quan tâm tại Aura Spa');
    }

    // Dedupe & cap
    const uniq: string[] = [];
    for (const r of reasons) {
      if (!uniq.some((u) => u.toLowerCase() === r.toLowerCase())) uniq.push(r);
    }
    if (uniq.length === 0) {
      uniq.push(cat ? `Thuộc nhóm ${cat} trên thực đơn Aura Spa` : 'Có trên thực đơn đang hoạt động tại Aura Spa');
    }
    return uniq.slice(0, 2);
  }

  private pickPopular(catalog: Service[], history: Array<{ name: string; category: string | null }>): Service[] {
    const histCats = new Set(history.map((h) => h.category).filter(Boolean) as string[]);
    const scored = catalog.map((s) => {
      let score = 0.4;
      if (histCats.has(s.category ?? '')) score += 0.2;
      if (s.isMultiSession) score += 0.05;
      if (/facial|massage|package|treatment/i.test(s.category ?? '')) score += 0.1;
      return { s, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((x) => x.s);
  }

  private capScore(score: number): number {
    // Soft-cap so UI never shows “100% chắc chắn”
    const s = Math.min(0.95, Math.max(0, Number(score) || 0.5));
    return Math.round(s * 100) / 100;
  }

  private async loadSafeHealth(userId: string): Promise<{
    skinType: string | null;
    blockDeepMassage: boolean;
  } | null> {
    const records = await this.healthRepo.find({
      where: { customerId: userId },
      order: { updatedAt: 'DESC' },
      take: 3,
    });
    if (!records.length) return null;
    const latest = records[0];
    const contra = `${latest.contraindications ?? ''} ${latest.notes ?? ''}`.toLowerCase();
    const blockDeepMassage = /massage\s*(sâu|mạnh|deep)|không\s*massage|chống\s*chỉ\s*định.*massage|no\s*deep\s*massage|không\s*massage\s*sâu/.test(
      contra,
    );
    return {
      skinType: latest.skinType,
      blockDeepMassage,
    };
  }

  private async loadHistorySummary(userId: string): Promise<Array<{ name: string; category: string | null }>> {
    const bookings = await this.bookingRepo.find({
      where: { customerId: userId, status: BookingStatus.Completed },
      order: { startTime: 'DESC' },
      take: 10,
    });
    if (!bookings.length) return [];

    const lines: Array<{ name: string; category: string | null }> = [];
    for (const b of bookings) {
      const services = await this.bookingServiceRepo.find({
        where: { bookingId: b.id },
        relations: ['service'],
      });
      for (const bs of services) {
        if (bs.service) {
          lines.push({ name: bs.service.name, category: bs.service.category });
        }
      }
    }
    return lines.slice(0, 8);
  }

  private async recommendWithOpenAi(
    catalog: Service[],
    dto: RecommendServicesDto,
    history: Array<{ name: string; category: string | null }>,
    health: { skinType: string | null; blockDeepMassage: boolean } | null,
    userId?: string | null,
  ): Promise<RecommendItemDto[]> {
    const slim = catalog.map((s) => ({
      serviceId: s.id,
      name: s.name,
      category: s.category,
      durationMinutes: s.defaultDurationMinutes,
      price: Number(s.defaultPrice),
      description: (s.description ?? '').slice(0, 160),
      isMultiSession: s.isMultiSession,
      totalSessions: s.totalSessions,
    }));

    const userPayload = {
      needText: redactPii(clampText(dto.needText ?? '', 500)),
      budgetMax: dto.budgetMax ?? null,
      preferredDuration: dto.preferredDuration ?? null,
      skinType: health?.skinType ?? null,
      blockDeepMassage: health?.blockDeepMassage ?? false,
      historyCategories: history.map((h) => h.category).filter(Boolean),
      historyNames: history.map((h) => h.name),
      catalog: slim,
      instruction:
        // eslint-disable-next-line max-len
        'reasons phải cụ thể (lịch sử dịch vụ, loại da, liệu trình). Cấm reason generic như "Phù hợp nhu cầu của bạn". Nếu needText vô nghĩa/không khớp catalog → recommendations rỗng.',
    };

    const result = await this.openAi.chat({
      feature: 'recommend',
      userId: userId ?? null,
      messages: [
        { role: 'system', content: PROMPTS.recommenderSystem },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
      maxTokens: 800,
    });

    const parsed = JSON.parse(result.content || '{"recommendations":[]}');
    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    return recs.map((r: any) => ({
      serviceId: String(r.serviceId),
      code: '',
      name: '',
      category: null,
      description: null,
      imageUrl: null,
      durationMinutes: 0,
      price: 0,
      score: Math.min(0.95, Math.max(0, Number(r.score) || 0.5)),
      reasons: Array.isArray(r.reasons) ? r.reasons.map(String).slice(0, 2) : [],
      caveats: Array.isArray(r.caveats) ? r.caveats.map(String).slice(0, 2) : [],
      bookingDeepLink: '',
    }));
  }

  private heuristicRecommend(
    catalog: Service[],
    dto: RecommendServicesDto,
    history: Array<{ name: string; category: string | null }>,
    health: { skinType: string | null; blockDeepMassage: boolean } | null,
    healthFiltered = false,
  ): RecommendItemDto[] {
    const need = (dto.needText ?? '').toLowerCase();
    const histCats = new Set(history.map((h) => h.category).filter(Boolean) as string[]);
    const askedMassage = /massage|body|xoa bóp/.test(need);

    const scored = catalog.map((s) => {
      let score = 0.4;
      const cat = (s.category ?? '').toLowerCase();
      const name = s.name.toLowerCase();
      const desc = (s.description ?? '').toLowerCase();

      if (need) {
        const tokens = need.split(/\s+/).filter((t) => t.length > 2);
        let hits = 0;
        for (const t of tokens) {
          if (name.includes(t) || desc.includes(t) || cat.includes(t)) hits++;
        }
        if (hits > 0) score += Math.min(0.35, hits * 0.08);
        if (/da|mụn|facial|dưỡng|cấp ẩm|skincare/.test(need) && /facial|skincare|treatment/.test(cat)) {
          score += 0.2;
        }
        if (/massage|thư giãn|stress|căng|mỏi|vai|cổ/.test(need) && /massage|body/.test(cat)) {
          score += 0.2;
        }
        if (/nail|móng/.test(need) && cat.includes('nail')) score += 0.25;
        if (/liệu trình|nhiều buổi|trẻ hóa/.test(need) && (s.isMultiSession || /treatment|facial/.test(cat))) {
          score += 0.15;
        }
      }

      if (histCats.has(s.category ?? '')) score += 0.15;
      if (health?.skinType && /facial|skincare|treatment/.test(cat)) score += 0.1;
      if (dto.budgetMax != null && Number(s.defaultPrice) <= dto.budgetMax * 0.8) score += 0.05;

      const reasons = this.buildConcreteReasons(s, history, health, dto.needText ?? '', healthFiltered, askedMassage);
      return { s, score: this.capScore(score), reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(({ s, score, reasons }) => this.toItem(s, score, reasons, [], dto.branchId, history.length > 0));
  }

  private toItem(s: Service, score: number, reasons: string[], caveats: string[], branchId?: string, _personalizedContext = false): RecommendItemDto {
    const params = new URLSearchParams({ serviceId: s.id, service: s.id });
    if (branchId) {
      params.set('branchId', branchId);
      params.set('branch', branchId);
    }
    const finalReasons =
      reasons.length && !reasons.every((r) => this.isGenericReason(r))
        ? reasons.filter((r) => !this.isGenericReason(r)).slice(0, 2)
        : [`Thuộc nhóm ${s.category || 'dịch vụ'} trên thực đơn Aura Spa`];

    return {
      serviceId: s.id,
      code: s.code,
      name: s.name,
      category: s.category,
      description: s.description,
      imageUrl: s.imageUrl,
      durationMinutes: s.defaultDurationMinutes,
      price: Number(s.defaultPrice),
      score: this.capScore(score),
      reasons: finalReasons,
      caveats,
      bookingDeepLink: `/booking?${params.toString()}`,
    };
  }
}
