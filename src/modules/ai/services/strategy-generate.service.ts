import { Injectable, Logger } from '@nestjs/common';
import { ReportService } from 'src/modules/report/report.service';
import { StrategyService } from 'src/modules/strategy/strategy.service';
import { Strategy, StrategyPriority, StrategyStatus } from 'src/modules/strategy/entities/strategy.entity';
import { OpenAiService } from '../openai.service';
import { PROMPTS } from '../prompt.registry';
import { GenerateStrategiesDto } from '../dto/generate-strategies.dto';
import { TrendGranularity } from 'src/modules/report/dto/revenue-dashboard.dto';

@Injectable()
export class StrategyGenerateService {
  private readonly logger = new Logger(StrategyGenerateService.name);

  constructor(
    private readonly openAi: OpenAiService,
    private readonly reportService: ReportService,
    private readonly strategyService: StrategyService,
  ) {}

  async generate(dto: GenerateStrategiesDto, ownerId: string): Promise<Strategy[]> {
    const to = dto.to ? new Date(dto.to) : new Date();
    const from = dto.from ? new Date(dto.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const max = dto.maxStrategies ?? 3;

    const [dashboard, branchRankings, serviceRankings] = await Promise.all([
      this.reportService.getRevenueDashboard(from, to, TrendGranularity.Day),
      this.reportService.getBranchRankings(from, to, 10),
      this.reportService.getPopularServicesRankings(from, to, 10),
    ]);

    const context = {
      period: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        totalRevenue: dashboard.totalRevenue,
        completedBookings: dashboard.totalCompletedBookings,
        cancelledBookings: dashboard.totalCancelledBookings,
        averageBookingValue: dashboard.averageBookingValue,
      },
      topBranches: branchRankings.rankings?.slice(0, 5) ?? [],
      topServices: serviceRankings.rankings?.slice(0, 5) ?? [],
      branchFilter: dto.branchId ?? null,
    };

    const dataDensity =
      (Number(dashboard.totalCompletedBookings) || 0) + (branchRankings.rankings?.length ?? 0) * 2 + (serviceRankings.rankings?.length ?? 0);

    let drafts: Array<{
      title: string;
      description: string;
      badge: string;
      priority: StrategyPriority;
      confidence: number;
      supportingHighlights: string[];
    }> = [];

    if (this.openAi.isConfigured()) {
      try {
        drafts = await this.generateWithOpenAi(context, max, ownerId);
        // Post-process: if model returned English titles, replace with Vietnamese heuristics
        if (drafts.some((d) => this.looksEnglish(d.title) || this.looksEnglish(d.description))) {
          this.logger.warn('Strategy output not Vietnamese — falling back to heuristic VI copy');
          drafts = this.heuristicStrategies(context as any, max, dataDensity);
        }
      } catch (err) {
        this.logger.warn(`Strategy OpenAI failed: ${err instanceof Error ? err.message : err}`);
        drafts = this.heuristicStrategies(context as any, max, dataDensity);
      }
    } else {
      drafts = this.heuristicStrategies(context as any, max, dataDensity);
    }

    // Cap model confidence by data density so thin windows cannot over-claim
    const densityCap = dataDensity < 5 ? 0.45 : dataDensity < 15 ? 0.62 : dataDensity < 30 ? 0.78 : 0.92;
    const baseConfidence = dataDensity < 5 ? 0.38 : dataDensity < 20 ? 0.58 : 0.8;
    const periodDays = Math.max(1, (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    const thinPeriod = periodDays <= 7 || dataDensity < 8;

    const saved: Strategy[] = [];

    for (const d of drafts.slice(0, max)) {
      let confidence = Math.min(densityCap, Math.max(0.2, d.confidence || baseConfidence));
      if (thinPeriod) {
        confidence = Math.min(confidence, 0.45);
      }
      const badge = this.sanitizeBadge(d.badge, d.priority);
      const highlights = [...(d.supportingHighlights ?? [])];
      if (thinPeriod && !highlights.some((h) => /mỏng|ít dữ liệu|thin|hạn chế/i.test(h))) {
        highlights.unshift(
          `Dữ liệu kỳ đang xét còn hạn chế (~${Math.round(periodDays)} ngày / density ${dataDensity}) — xem kỹ trước khi kích hoạt.`,
        );
      }
      const strategy = await this.strategyService.createAi(
        {
          title: d.title.slice(0, 255),
          description: d.description.slice(0, 4000),
          badge,
          priority: d.priority || StrategyPriority.Medium,
          status: StrategyStatus.Proposed,
          aiConfidence: Math.round(confidence * 1000) / 1000,
          supportingData: {
            period: context.period,
            dataDensity,
            periodDays: Math.round(periodDays),
            thinPeriod,
            highlights,
            totals: context.totals,
            topBranches: context.topBranches,
            topServices: context.topServices,
          },
        },
        ownerId,
      );
      saved.push(strategy);
    }

    return saved;
  }

  /** Never leak priority enum into badge field. */
  private sanitizeBadge(raw: string | undefined, priority: StrategyPriority): string {
    const b = (raw || '').trim();
    const lower = b.toLowerCase();
    if (!b || ['high', 'medium', 'low', 'cao', 'thấp', 'trung bình'].includes(lower)) {
      if (priority === StrategyPriority.High) return 'Vận hành';
      if (priority === StrategyPriority.Low) return 'Theo dõi';
      return 'Chiến lược';
    }
    // Strip accidental priority prefixes
    return b.replace(/^(high|medium|low)\s*[-–:]?\s*/i, '').slice(0, 100) || 'Chiến lược';
  }

  private async generateWithOpenAi(
    context: Record<string, unknown>,
    max: number,
    ownerId: string,
  ): Promise<
    Array<{
      title: string;
      description: string;
      badge: string;
      priority: StrategyPriority;
      confidence: number;
      supportingHighlights: string[];
    }>
  > {
    const result = await this.openAi.chat({
      feature: 'strategy',
      userId: ownerId,
      messages: [
        { role: 'system', content: PROMPTS.strategySystem },
        {
          role: 'user',
          content: JSON.stringify({ maxStrategies: max, metrics: context }),
        },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.4,
      maxTokens: 1200,
    });

    const parsed = JSON.parse(result.content || '{"strategies":[]}');
    const list = Array.isArray(parsed.strategies) ? parsed.strategies : [];
    return list.map((s: any) => ({
      title: String(s.title || 'Chiến lược đề xuất'),
      description: String(s.description || ''),
      badge: String(s.badge || 'AI'),
      priority: this.mapPriority(s.priority),
      confidence: Number(s.confidence) || 0.7,
      supportingHighlights: Array.isArray(s.supportingHighlights) ? s.supportingHighlights.map(String).slice(0, 5) : [],
    }));
  }

  private heuristicStrategies(
    context: {
      totals: Record<string, unknown>;
      topBranches: Array<{ branchName?: string; totalRevenue?: number }>;
      topServices: Array<{ serviceName?: string; bookingCount?: number }>;
      period: { from: string; to: string };
    },
    max: number,
    dataDensity: number,
  ) {
    const conf = dataDensity < 5 ? 0.42 : dataDensity < 20 ? 0.62 : 0.85;
    const rev = Number(context.totals.totalRevenue ?? 0);
    const cancel = Number(context.totals.cancelledBookings ?? 0);
    const completed = Number(context.totals.completedBookings ?? 0);
    const topBranch = context.topBranches[0]?.branchName ?? 'chi nhánh dẫn đầu';
    const topService = context.topServices[0]?.serviceName ?? 'dịch vụ phổ biến';

    const all = [
      {
        title: 'Tăng công suất chi nhánh dẫn đầu',
        // eslint-disable-next-line max-len
        description: `Tập trung slot và marketing cho ${topBranch} dựa trên doanh thu gần đây (${rev.toLocaleString('vi-VN')}đ). Mở thêm khung giờ cao điểm và gói combo ${topService}.`,
        badge: 'Vận hành',
        priority: StrategyPriority.High,
        confidence: conf,
        supportingHighlights: [`Doanh thu kỳ: ${rev.toLocaleString('vi-VN')}đ`, `Top chi nhánh: ${topBranch}`, `Hoàn thành: ${completed} booking`],
      },
      {
        title: 'Giảm hủy lịch & no-show',
        description: `Trong kỳ có ${cancel} lượt hủy. Triển khai nhắc lịch 24h, đặt cọc rõ ràng hơn và ưu đãi đổi lịch thay vì hủy để giữ doanh thu.`,
        badge: 'Retention',
        priority: StrategyPriority.Medium,
        confidence: conf,
        supportingHighlights: [`Hủy: ${cancel}`, `Hoàn thành: ${completed}`, 'Đề xuất: nhắc lịch + deposit policy'],
      },
      {
        title: `Đẩy mạnh gói ${topService}`,
        description: `${topService} đang thuộc nhóm hot. Tạo bundle multi-session, cross-sell sau facial/massage và content social theo liệu trình.`,
        badge: 'Marketing',
        priority: StrategyPriority.Medium,
        confidence: conf,
        supportingHighlights: [`Top service: ${topService}`, `Kỳ: ${context.period.from.slice(0, 10)} → ${context.period.to.slice(0, 10)}`],
      },
    ];
    return all.slice(0, max);
  }

  private mapPriority(p: unknown): StrategyPriority {
    const v = String(p || '').toLowerCase();
    if (v === 'high') return StrategyPriority.High;
    if (v === 'low') return StrategyPriority.Low;
    return StrategyPriority.Medium;
  }

  /** Detect English-only marketing copy (no Vietnamese diacritics, has Latin words). */
  private looksEnglish(text: string): boolean {
    const t = (text || '').trim();
    if (t.length < 8) return false;
    const hasVi = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(t);
    if (hasVi) return false;
    const enWords = (t.match(/\b[a-zA-Z]{4,}\b/g) || []).length;
    return enWords >= 3;
  }
}
