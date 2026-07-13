import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { BranchService } from 'src/modules/branch/branch.service';
import { BranchStatus } from 'src/modules/branch/enums/branch-status.enum';
import { ServiceService } from 'src/modules/service/service.service';
import { ServiceStatus } from 'src/modules/service/enums/service-status.enum';
import { BookingAvailabilityService } from 'src/modules/booking/booking-availability.service';
import { BookingService } from 'src/modules/booking/booking.service';
import { OpenAiService, ToolDefinition } from '../openai.service';
import { PROMPTS } from '../prompt.registry';
import { clampText, redactPii } from '../pii-redactor';
import { ConciergeChatDto, ConciergeChatResponseDto, UiActionDto } from '../dto/concierge-chat.dto';

const DISCLAIMER = 'Thông tin lịch/giá lấy từ hệ thống. Bạn xác nhận trước khi tạo lịch hẹn.';

/** API availability returns HH:mm — booking create needs ISO 8601 (+07). */
function toIsoStart(dateYmd: string, timeHm: string): string {
  const t = timeHm.length === 5 ? `${timeHm}:00` : timeHm;
  // Already ISO?
  if (timeHm.includes('T') || timeHm.includes('+') || timeHm.endsWith('Z')) return timeHm;
  return `${dateYmd}T${t}+07:00`;
}

/** Explicit wish to create / confirm a booking (not mere info). */
function hasBookingIntent(text: string): boolean {
  return /đặt lịch|đặt giúp|book|booking|xác nhận đặt|đặt luôn|đặt ngay|đồng ý đặt|confirm booking|giữ chỗ/i.test(text);
}

/** User is asking for availability / time slots (may still lack branch/service). */
function hasSlotIntent(text: string): boolean {
  return /slot|lịch trống|khung giờ|còn chỗ|còn lịch|availability|giờ nào|ngày mai|hôm nay|tuần sau/i.test(text);
}

/** Pure information query — must NOT auto-pick service/slot/draft. */
function isInfoOnlyQuery(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (hasBookingIntent(t)) return false;
  // Branch / address / open hours listing
  if (/chi nhánh|branch|ở đâu|địa chỉ|đang mở|mở cửa|các cơ sở|có bao nhiêu chi nhánh/.test(t) && !hasSlotIntent(t) && !/đặt|book/.test(t)) {
    return true;
  }
  // Catalog / price / promo — without booking verbs
  if (
    /dịch vụ|menu|bảng giá|giá bao nhiêu|bao nhiêu tiền|khuyến mãi|promotion|liệu trình nào|có những gì/.test(t) &&
    !hasSlotIntent(t) &&
    !hasBookingIntent(t)
  ) {
    return true;
  }
  // Technician list only
  return /kỹ thuật viên|technician|nhân viên kỹ thuật|ai làm được/.test(t) && !hasSlotIntent(t);
}

function mentionsService(text: string): boolean {
  return /facial|massage|body|nail|cấp ẩm|skincare|gói|liệu trình|thư giãn|cổ vai|da mặt|da dầu|da khô/i.test(text);
}

function mentionsBranchHint(text: string): boolean {
  return /quận\s*\d|q\s*\d|hcm|hà nội|đà nẵng|thủ đức|bình thạnh|phú nhuận|chi nhánh/i.test(text);
}

const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_branches',
      description: 'Danh sách chi nhánh đang hoạt động',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_services',
      description: 'Danh sách dịch vụ active (tên, giá, thời lượng, category)',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_availability',
      description: 'Lấy slot trống theo branchId, serviceId, date YYYY-MM-DD',
      parameters: {
        type: 'object',
        properties: {
          branchId: { type: 'string' },
          serviceId: { type: 'string' },
          date: { type: 'string' },
          technicianId: { type: 'string' },
        },
        required: ['branchId', 'serviceId', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_technicians',
      description: 'Kỹ thuật viên active tại chi nhánh',
      parameters: {
        type: 'object',
        properties: { branchId: { type: 'string' } },
        required: ['branchId'],
      },
    },
  },
];

@Injectable()
export class ConciergeService {
  private readonly logger = new Logger(ConciergeService.name);

  constructor(
    private readonly openAi: OpenAiService,
    private readonly branchService: BranchService,
    private readonly serviceService: ServiceService,
    private readonly availabilityService: BookingAvailabilityService,
    private readonly bookingService: BookingService,
  ) {}

  async chat(dto: ConciergeChatDto, userId?: string | null): Promise<ConciergeChatResponseDto> {
    const lastUser = [...dto.messages].reverse().find((m) => m.role === 'user');
    const userText = redactPii(clampText(lastUser?.content ?? '', 500));

    // Explicit confirm booking path (human-in-the-loop)
    if (dto.confirmBooking && dto.bookingDraft) {
      return this.confirmCreateBooking(dto.bookingDraft, userId);
    }

    if (/gặp nhân viên|nói với người|chuyển nhân viên|tư vấn viên|người thật/i.test(userText)) {
      return {
        assistantMessage: 'Mình sẽ chuyển bạn sang kênh chat với nhân viên Aura Spa. Chọn tab **Nhân viên** để tiếp tục nhé.',
        toolTrace: [],
        uiActions: [{ type: 'escalate_human', label: 'Chat với nhân viên' }],
        bookingDraft: null,
        bookingCreated: null,
        escalateToHuman: true,
        meta: { source: 'heuristic', disclaimer: DISCLAIMER },
      };
    }

    // Multi-intent: ≥2 service types / conflicting asks → clarify before tools/booking
    const clarify = this.detectMultiIntentClarify(userText);
    if (clarify) {
      return clarify;
    }

    // Info-only path: never invent service/slot/draft (OpenAI often over-automates)
    if (isInfoOnlyQuery(userText)) {
      return this.heuristicChat(userText, userId);
    }

    // Slot without service → ask, do not default-pick a service
    if (hasSlotIntent(userText) && !mentionsService(userText) && !hasBookingIntent(userText)) {
      return this.askClarifyServiceOrBranch(userText);
    }

    if (this.openAi.isConfigured()) {
      try {
        return await this.chatWithOpenAi(dto, userId, userText);
      } catch (err) {
        this.logger.warn(`Concierge OpenAI failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    return this.heuristicChat(userText, userId);
  }

  /** Slot/time asked but no service named — stop before auto-picking Facial. */
  private askClarifyServiceOrBranch(userText: string): ConciergeChatResponseDto {
    const wantsTomorrow = /ngày mai|tomorrow/i.test(userText);
    const dayHint = wantsTomorrow ? 'ngày mai' : 'ngày bạn chọn';
    return {
      /* eslint-disable max-len */
      assistantMessage: wantsTomorrow
        ? `Bạn muốn xem lịch **${dayHint}** cho dịch vụ nào ạ? (ví dụ: Facial, Massage, gói liệu trình…)\n\nNếu đã biết chi nhánh, cho mình biết luôn để tra slot chính xác hơn.`
        : 'Bạn muốn xem **slot / lịch trống** cho dịch vụ nào và (nếu có) chi nhánh nào ạ? Mình chưa chọn sẵn dịch vụ giúp bạn để tránh đặt nhầm.',
      /* eslint-enable max-len */
      toolTrace: [],
      uiActions: [
        { type: 'quick_reply', label: 'Facial ngày mai' },
        { type: 'quick_reply', label: 'Massage ngày mai' },
        { type: 'quick_reply', label: 'Chi nhánh đang mở' },
      ],
      bookingDraft: null,
      bookingCreated: null,
      escalateToHuman: false,
      meta: { source: 'heuristic', disclaimer: DISCLAIMER },
    };
  }

  /**
   * When user piles multiple services/times without clear priority, ask one clarifying question
   * instead of silently booking only the first match.
   */
  private detectMultiIntentClarify(userText: string): ConciergeChatResponseDto | null {
    const t = userText.toLowerCase();
    const intents: Array<{ key: string; label: string; re: RegExp }> = [
      { key: 'facial', label: 'Facial / chăm sóc da', re: /facial|da mặt|cấp ẩm|skincare|trẻ hóa da/ },
      { key: 'massage', label: 'Massage / body', re: /massage|xoa bóp|body|cổ vai|thư giãn toàn thân/ },
      { key: 'nail', label: 'Nail', re: /nail|móng/ },
      { key: 'package', label: 'Gói / liệu trình nhiều buổi', re: /gói|liệu trình|nhiều buổi|package|couple|cặp đôi/ },
    ];
    const hit = intents.filter((i) => i.re.test(t));
    const multiService = hit.length >= 2;
    const andTogether =
      /(và|cùng lúc|đồng thời|rồi|sau đó).{0,40}(facial|massage|nail|gói|liệu)/i.test(t) ||
      /(facial|massage).{0,40}(và|cùng|với).{0,40}(facial|massage|nail|gói)/i.test(t);

    if (!multiService && !andTogether) return null;
    // If user already narrowed ("chỉ facial", "ưu tiên massage") skip clarify
    if (/chỉ\s+(facial|massage|nail)|ưu tiên|trước hết|thôi\b/.test(t)) return null;

    const labels = (hit.length >= 2 ? hit : intents.filter((i) => i.re.test(t))).map((i) => i.label);
    const unique = [...new Set(labels)];
    const msg =
      /* eslint-disable max-len */
      unique.length >= 2
        ? `Mình thấy bạn đang quan tâm tới **nhiều dịch vụ** (${unique.join(', ')}). Hiện mỗi lịch hẹn trên hệ thống gắn **một dịch vụ chính**.\n\nBạn muốn mình **kiểm tra slot cho dịch vụ nào trước**?`
        : 'Bạn đang gộp nhiều yêu cầu trong một câu. Bạn muốn mình **tìm slot cho dịch vụ nào trước** (Facial / Massage / Gói liệu trình)?';
    /* eslint-enable max-len */

    return {
      assistantMessage: msg,
      toolTrace: [],
      uiActions: unique.slice(0, 4).map((label) => ({
        type: 'quick_reply' as const,
        label: label.includes('Facial')
          ? 'Ưu tiên Facial ngày mai'
          : label.includes('Massage')
            ? 'Ưu tiên Massage ngày mai'
            : label.includes('Nail')
              ? 'Ưu tiên Nail'
              : 'Ưu tiên liệu trình nhiều buổi',
      })),
      bookingDraft: null,
      bookingCreated: null,
      escalateToHuman: false,
      meta: { source: 'heuristic', disclaimer: DISCLAIMER },
    };
  }

  private async confirmCreateBooking(
    draft: NonNullable<ConciergeChatDto['bookingDraft']>,
    userId?: string | null,
  ): Promise<ConciergeChatResponseDto> {
    if (!userId) {
      throw new ForbiddenException('Vui lòng đăng nhập để xác nhận đặt lịch');
    }
    const booking = await this.bookingService.create(
      {
        branchId: draft.branchId,
        serviceId: draft.serviceId,
        startTime: draft.startTime,
        technicianId: draft.technicianId,
        notes: draft.notes,
      },
      userId,
    );

    return {
      assistantMessage: `Đã tạo lịch hẹn #${booking.id}. Bạn có thể xem tại **Lịch hẹn của tôi** và hoàn tất đặt cọc nếu hệ thống yêu cầu.`,
      toolTrace: [{ name: 'create_booking', ok: true, summary: `booking ${booking.id}` }],
      uiActions: [
        { type: 'deep_link', label: 'Xem lịch hẹn', href: '/customer/bookings' },
        {
          type: 'deep_link',
          label: 'Thanh toán đặt cọc',
          href: `/customer/payment/${booking.id}`,
        },
      ],
      bookingDraft: null,
      bookingCreated: { id: booking.id },
      escalateToHuman: false,
      meta: { source: 'heuristic', disclaimer: DISCLAIMER },
    };
  }

  private async chatWithOpenAi(dto: ConciergeChatDto, userId: string | null | undefined, userText: string): Promise<ConciergeChatResponseDto> {
    const history = dto.messages.slice(-12).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: redactPii(clampText(m.content, 800)),
    }));

    const allowAvailability = (hasSlotIntent(userText) || hasBookingIntent(userText)) && mentionsService(userText);
    const allowDraftActions = hasSlotIntent(userText) || hasBookingIntent(userText);

    const toolsForTurn = allowAvailability ? TOOLS : TOOLS.filter((t) => t.function.name !== 'get_availability');

    const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string }> = [
      {
        role: 'system',
        // eslint-disable-next-line max-len
        content: `${PROMPTS.conciergeSystem}\nUserAuthenticated: ${Boolean(userId)}\nAllowGetAvailability: ${allowAvailability}\nLastUserMessage: ${userText.slice(0, 300)}`,
      },
      ...history,
    ];

    const toolTrace: ConciergeChatResponseDto['toolTrace'] = [];
    let bookingDraft: ConciergeChatResponseDto['bookingDraft'] = null;
    const uiActions: UiActionDto[] = [];
    let rounds = 0;

    while (rounds < 5) {
      rounds++;
      const result = await this.openAi.chat({
        feature: 'concierge',
        userId: userId ?? null,
        messages: messages as any,
        tools: toolsForTurn,
        temperature: 0.25,
        maxTokens: 700,
      });

      if (result.toolCalls.length === 0) {
        let content = result.content ?? 'Xin lỗi, mình chưa trả lời được. Bạn thử lại hoặc chat nhân viên nhé.';
        const escalate = /CHUYỂN_NHÂN_VIÊN|gặp nhân viên/i.test(content);
        content = content.replace(/CHUYỂN_NHÂN_VIÊN/g, '').trim();
        if (escalate) {
          uiActions.push({ type: 'escalate_human', label: 'Chat với nhân viên' });
        }
        if (allowDraftActions) {
          this.extractDeepLinks(content, uiActions);
        }
        return {
          assistantMessage: content.slice(0, 2500),
          toolTrace,
          uiActions: this.uniqueActions(uiActions),
          bookingDraft: allowDraftActions ? bookingDraft : null,
          bookingCreated: null,
          escalateToHuman: escalate,
          meta: { source: 'openai', disclaimer: DISCLAIMER },
        };
      }

      messages.push({
        role: 'assistant',
        content: result.content ?? '',
      } as any);

      for (const tc of result.toolCalls) {
        // Hard guard: never run availability for info-only / underspecified turns
        if (tc.name === 'get_availability' && !allowAvailability) {
          toolTrace.push({
            name: 'get_availability',
            ok: false,
            summary: 'blocked: need service + slot/booking intent',
          });
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({
              error:
                // eslint-disable-next-line max-len
                'Không được gọi get_availability khi user chỉ hỏi thông tin hoặc chưa chỉ định dịch vụ. Hãy hỏi lại hoặc list_branches/list_services.',
            }),
          });
          continue;
        }

        const { ok, summary, data } = await this.executeTool(tc.name, tc.arguments);
        toolTrace.push({ name: tc.name, ok, summary });
        if (tc.name === 'get_availability' && ok && data && allowDraftActions) {
          const d = data as {
            branchId: string;
            serviceId: string;
            date?: string;
            slots?: Array<{ startTime: string; available: boolean }>;
          };
          const first = d.slots?.find((s) => s.available);
          if (first) {
            const dateYmd = d.date || new Date().toISOString().slice(0, 10);
            const isoStart = toIsoStart(dateYmd, first.startTime);
            bookingDraft = {
              branchId: d.branchId,
              serviceId: d.serviceId,
              startTime: isoStart,
            };
            const href = `/booking?branchId=${d.branchId}&branch=${d.branchId}&serviceId=${d.serviceId}&service=${d.serviceId}`;
            uiActions.push({ type: 'deep_link', label: 'Mở trang đặt lịch', href });
            // Only offer confirm when user is in slot/booking flow — still human-in-the-loop
            if (userId && hasBookingIntent(userText)) {
              uiActions.push({
                type: 'confirm_booking',
                label: 'Xác nhận đặt slot gợi ý',
                payload: bookingDraft,
              });
            } else if (userId) {
              uiActions.push({
                type: 'confirm_booking',
                label: 'Xác nhận slot sớm nhất',
                payload: bookingDraft,
              });
            } else {
              uiActions.push({ type: 'login', label: 'Đăng nhập để đặt lịch', href: '/login' });
            }
          }
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(data).slice(0, 4000),
        });
      }

      if (rounds >= 2) {
        const final = await this.openAi.chat({
          feature: 'concierge',
          userId: userId ?? null,
          messages: [
            {
              role: 'system',
              content: `${PROMPTS.conciergeSystem}\nChỉ tóm tắt dữ liệu tool. Không tự tạo booking. Không bịa slot.`,
            },
            ...history,
            {
              role: 'user',
              content: `Dữ liệu tool (JSON):\n${messages
                .filter((m) => m.role === 'tool')
                .slice(-3)
                .map((m) => m.content)
                .join('\n')
                .slice(0, 3500)}\n\nTrả lời ngắn, đúng ý user. Nếu chỉ hỏi thông tin thì chỉ thông tin + hỏi có muốn đặt không.`,
            },
          ],
          temperature: 0.25,
          maxTokens: 700,
        });
        const content = final.content ?? 'Đã tra cứu xong. Bạn muốn xem thêm hay đặt lịch không?';
        if (allowDraftActions) {
          this.extractDeepLinks(content, uiActions);
        }
        return {
          assistantMessage: content.slice(0, 2500),
          toolTrace,
          uiActions: this.uniqueActions(uiActions),
          bookingDraft: allowDraftActions ? bookingDraft : null,
          bookingCreated: null,
          escalateToHuman: false,
          meta: { source: 'openai', disclaimer: DISCLAIMER },
        };
      }
    }

    return this.heuristicChat(history[history.length - 1]?.content ?? '', userId);
  }

  private async executeTool(name: string, argsJson: string): Promise<{ ok: boolean; summary: string; data: unknown }> {
    try {
      const args = argsJson ? JSON.parse(argsJson) : {};
      switch (name) {
        case 'list_branches': {
          const branches = await this.branchService.findAll(BranchStatus.Active);
          const data = branches.map((b) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            address: b.address,
            city: b.city,
          }));
          return { ok: true, summary: `${data.length} branches`, data };
        }
        case 'list_services': {
          const services = await this.serviceService.findAll(ServiceStatus.Active);
          const data = services.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            durationMinutes: s.defaultDurationMinutes,
            price: Number(s.defaultPrice),
          }));
          return { ok: true, summary: `${data.length} services`, data };
        }
        case 'get_availability': {
          const slots = await this.availabilityService.getAvailableSlots(args.branchId, args.serviceId, args.date, args.technicianId);
          const available = slots.slots?.filter((s: any) => s.available)?.length ?? 0;
          return {
            ok: true,
            summary: `${available} open slots on ${args.date}`,
            data: { ...slots, branchId: args.branchId, serviceId: args.serviceId },
          };
        }
        case 'list_technicians': {
          const techs = await this.branchService.findActiveTechnicians(args.branchId);
          const data = techs.map((t) => ({
            id: t.userId,
            staffCode: t.staffCode,
            name: t.user?.fullName ?? null,
          }));
          return { ok: true, summary: `${data.length} technicians`, data };
        }
        default:
          return { ok: false, summary: `Unknown tool ${name}`, data: null };
      }
    } catch (err) {
      return {
        ok: false,
        summary: err instanceof Error ? err.message : 'tool error',
        data: { error: err instanceof Error ? err.message : 'error' },
      };
    }
  }

  private async heuristicChat(userText: string, userId?: string | null): Promise<ConciergeChatResponseDto> {
    const branches = await this.branchService.findAll(BranchStatus.Active);
    const services = await this.serviceService.findAll(ServiceStatus.Active);
    const uiActions: UiActionDto[] = [
      { type: 'quick_reply', label: 'Chi nhánh đang mở' },
      { type: 'quick_reply', label: 'Dịch vụ Facial' },
      { type: 'quick_reply', label: 'Slot ngày mai' },
    ];

    const lower = userText.toLowerCase();
    const wantsSlots = hasSlotIntent(lower) || hasBookingIntent(lower);
    const bookingish = hasBookingIntent(lower);

    // --- Info: branches only ---
    if (/chi nhánh|branch|ở đâu|địa chỉ|đang mở|mở cửa|các cơ sở/.test(lower) && !wantsSlots) {
      const list = branches
        .slice(0, 8)
        .map((b) => `• **${b.name}** — ${b.address}`)
        .join('\n');
      return {
        // eslint-disable-next-line max-len
        assistantMessage: `Hiện Aura Spa có **${branches.length} chi nhánh** đang hoạt động:\n${list}\n\nBạn muốn xem **dịch vụ** hay **đặt lịch** tại chi nhánh nào không?`,
        toolTrace: [{ name: 'list_branches', ok: true, summary: `${branches.length} branches` }],
        uiActions: [
          { type: 'quick_reply', label: 'Dịch vụ Facial' },
          { type: 'quick_reply', label: 'Facial ngày mai' },
          ...branches.slice(0, 2).map((b) => ({
            type: 'quick_reply' as const,
            label: `Xem thêm: ${b.name.replace(/^Aura Spa\s*[–-]\s*/i, '').slice(0, 22)}`,
          })),
        ],
        bookingDraft: null,
        bookingCreated: null,
        escalateToHuman: false,
        meta: { source: 'heuristic', disclaimer: DISCLAIMER },
      };
    }

    // --- Info: services / promo / price (no auto draft) ---
    if (!wantsSlots && /dịch vụ|service|facial|massage|menu|liệu trình|giá|khuyến mãi|promotion|bảng giá/.test(lower)) {
      const matched = services.filter((s) => {
        if (/facial|da|cấp ẩm|skincare/.test(lower)) return /facial|skincare/i.test(s.category ?? '') || /da|facial|cấp ẩm/i.test(s.name);
        if (/massage|thư giãn|căng|body/.test(lower)) return /massage|body/i.test(s.category ?? '');
        if (/nail|móng/.test(lower)) return /nail/i.test(s.category ?? '');
        if (/khuyến mãi|promotion/.test(lower)) return true;
        return true;
      });
      const pick = (matched.length ? matched : services).slice(0, 5);
      const list = pick
        .map((s) => `• **${s.name}** (${s.defaultDurationMinutes} phút) — ${Number(s.defaultPrice).toLocaleString('vi-VN')}đ`)
        .join('\n');
      return {
        /* eslint-disable max-len */
        assistantMessage: /khuyến mãi|promotion/.test(lower)
          ? `Mình liệt kê một số dịch vụ đang có trên hệ thống (ưu đãi chi tiết có thể đổi theo đợt):\n${list}\n\nBạn muốn **xem slot** cho dịch vụ nào, tại chi nhánh nào?`
          : `Một số dịch vụ liên quan:\n${list}\n\nBạn muốn **đặt lịch** cho dịch vụ nào, hay cần thêm thông tin giá/thời lượng?`,
        /* eslint-enable max-len */
        toolTrace: [{ name: 'list_services', ok: true, summary: `${pick.length} services` }],
        uiActions: [
          ...pick.slice(0, 3).map((s) => ({
            type: 'quick_reply' as const,
            label: `Slot: ${s.name.slice(0, 28)}`,
          })),
          { type: 'quick_reply', label: 'Chi nhánh đang mở' },
        ],
        bookingDraft: null,
        bookingCreated: null,
        escalateToHuman: false,
        meta: { source: 'heuristic', disclaimer: DISCLAIMER },
      };
    }

    // --- Slot / booking intent ---
    if (wantsSlots) {
      // No service named → clarify (never default to first catalog item)
      if (!mentionsService(lower)) {
        return this.askClarifyServiceOrBranch(userText);
      }

      const service =
        services.find((s) => {
          if (/facial|da|skincare|cấp ẩm/.test(lower)) return /facial|skincare/i.test(s.category ?? '') || /facial|da|cấp ẩm/i.test(s.name);
          if (/massage|body|thư giãn|căng/.test(lower)) return /massage|body/i.test(s.category ?? '') || /massage/i.test(s.name);
          if (/nail|móng/.test(lower)) return /nail/i.test(s.category ?? '') || /nail|móng/i.test(s.name);
          return false;
        }) ?? null;

      if (!service) {
        return this.askClarifyServiceOrBranch(userText);
      }

      // Branch: only auto-pick when user gave a geo/name hint; else ask
      // Match full name OR distinctive tokens (e.g. "Ngũ Hành Sơn", "Quận 1", "Hoàn Kiếm")
      const branchByHint = branches.find((b) => {
        const name = (b.name ?? '').toLowerCase();
        const city = (b.city ?? '').toLowerCase();
        const code = (b.code ?? '').toLowerCase();
        const addr = (b.address ?? '').toLowerCase();
        if (name && lower.includes(name)) return true;
        if (city && city.length >= 4 && lower.includes(city)) return true;
        if (code && lower.includes(code.toLowerCase())) return true;
        // Strip brand prefix "aura spa –/-" to match short names
        const shortName = name.replace(/^aura\s*spa\s*[–\-:]\s*/i, '').trim();
        if (shortName.length >= 4 && lower.includes(shortName)) return true;
        // Token overlap: significant multi-word chunks from branch name
        const tokens = shortName.split(/[\s,]+/).filter((t) => t.length >= 3);
        if (tokens.length >= 2 && tokens.every((t) => lower.includes(t))) return true;
        if (/quận\s*1|q\s*1|\bq1\b/.test(lower) && /q1|quận 1|nguyen hue|bến nghé|ben nghe/i.test(`${name} ${code} ${addr}`)) return true;
        if (/quận\s*7|q\s*7|\bq7\b/.test(lower) && /q7|quận 7/i.test(`${name} ${code} ${addr}`)) return true;
        if (/hoàn kiếm|hoan kiem/.test(lower) && /hoàn kiếm|hoan kiem/i.test(`${name} ${addr}`)) return true;
        if (/ngũ hành sơn|ngu hanh son/.test(lower) && /ngũ hành|ngu hanh|hành sơn/i.test(`${name} ${addr}`)) return true;
        if (/mỹ khê|my khe/.test(lower) && /mỹ khê|my khe/i.test(`${name} ${addr}`)) return true;
        return /sông hàn|song han/.test(lower) && /sông hàn|song han|bạch đằng/i.test(`${name} ${addr}`);
      });

      if (!branchByHint && !mentionsBranchHint(lower)) {
        const branchChips = branches.slice(0, 4).map((b) => ({
          type: 'quick_reply' as const,
          label: `${service!.name.slice(0, 16)} @ ${b.name.replace(/^Aura Spa\s*[–-]\s*/i, '').slice(0, 18)}`,
        }));
        return {
          assistantMessage: `Bạn muốn xem slot **${service.name}** tại **chi nhánh nào** ạ?\n\n${branches
            .slice(0, 6)
            .map((b) => `• ${b.name}`)
            .join('\n')}`,
          toolTrace: [{ name: 'list_branches', ok: true, summary: `${branches.length} branches` }],
          uiActions: branchChips,
          bookingDraft: null,
          bookingCreated: null,
          escalateToHuman: false,
          meta: { source: 'heuristic', disclaimer: DISCLAIMER },
        };
      }

      const branch = branchByHint ?? branches.find((b) => b.code === 'HCM-Q1') ?? branches[0];

      if (branch && service) {
        const date = new Date();
        const vnNow = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        if (/ngày mai|tomorrow/.test(lower)) vnNow.setDate(vnNow.getDate() + 1);
        const yyyy = `${vnNow.getFullYear()}-${String(vnNow.getMonth() + 1).padStart(2, '0')}-${String(vnNow.getDate()).padStart(2, '0')}`;
        try {
          const slots = await this.availabilityService.getAvailableSlots(branch.id, service.id, yyyy);
          const open = (slots.slots || []).filter((s: any) => s.available).slice(0, 4);
          if (open.length === 0) {
            return {
              // eslint-disable-next-line max-len
              assistantMessage: `Hiện **chưa còn slot trống** cho **${service.name}** tại **${branch.name}** ngày ${yyyy}. Bạn thử ngày khác hoặc chi nhánh khác nhé.`,
              toolTrace: [{ name: 'get_availability', ok: true, summary: '0 slots' }],
              uiActions: [
                {
                  type: 'deep_link',
                  label: 'Mở trang đặt lịch',
                  href: `/booking?branchId=${branch.id}&branch=${branch.id}&serviceId=${service.id}&service=${service.id}`,
                },
                { type: 'quick_reply', label: 'Chi nhánh đang mở' },
              ],
              bookingDraft: null,
              bookingCreated: null,
              escalateToHuman: false,
              meta: { source: 'heuristic', disclaimer: DISCLAIMER },
            };
          }
          const lines = open
            .map((s: any) => {
              const iso = toIsoStart(yyyy, s.startTime);
              return `• ${new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}`;
            })
            .join('\n');
          const draft = {
            branchId: branch.id,
            serviceId: service.id,
            startTime: toIsoStart(yyyy, open[0].startTime),
            branchName: branch.name,
            serviceName: service.name,
            price: Number(service.defaultPrice),
            durationMinutes: service.defaultDurationMinutes,
          };
          const actions: UiActionDto[] = [
            {
              type: 'deep_link',
              label: 'Mở trang đặt lịch',
              href: `/booking?branchId=${branch.id}&branch=${branch.id}&serviceId=${service.id}&service=${service.id}`,
            },
          ];
          // Offer confirm only after we showed options — still requires explicit UI click
          if (userId) {
            actions.unshift({
              type: 'confirm_booking',
              label: bookingish ? 'Xác nhận đặt slot sớm nhất' : 'Xác nhận slot sớm nhất',
              payload: draft,
            });
          } else {
            actions.unshift({ type: 'login', label: 'Đăng nhập để đặt', href: '/login' });
          }
          return {
            // eslint-disable-next-line max-len
            assistantMessage: `Slot gợi ý cho **${service.name}** tại **${branch.name}** (${yyyy}):\n${lines}\n\nGiá niêm yết: **${Number(service.defaultPrice).toLocaleString('vi-VN')}đ** / ${service.defaultDurationMinutes} phút.\n\nBạn muốn **chọn slot** hoặc **xác nhận** trên nút bên dưới nhé — mình chưa tạo lịch hẹn cho đến khi bạn xác nhận.`,
            toolTrace: [{ name: 'get_availability', ok: true, summary: `${open.length} slots` }],
            uiActions: actions,
            bookingDraft: draft,
            bookingCreated: null,
            escalateToHuman: false,
            meta: { source: 'heuristic', disclaimer: DISCLAIMER },
          };
        } catch (err) {
          this.logger.warn(`availability heuristic failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    return {
      assistantMessage:
        // eslint-disable-next-line max-len
        'Mình có thể giúp **tra chi nhánh**, **dịch vụ**, hoặc **slot trống**.\n\nVí dụ: “Chi nhánh đang mở”, “Dịch vụ Facial”, “Facial ngày mai Quận 1”.\nMình chỉ tạo lịch hẹn sau khi bạn **xác nhận** rõ ràng.',
      toolTrace: [],
      uiActions,
      bookingDraft: null,
      bookingCreated: null,
      escalateToHuman: false,
      meta: { source: 'heuristic', disclaimer: DISCLAIMER },
    };
  }

  private extractDeepLinks(content: string, uiActions: UiActionDto[]) {
    const re = /\/booking\?[^\s)]+/g;
    const matches = content.match(re) ?? [];
    for (const href of matches.slice(0, 3)) {
      uiActions.push({ type: 'deep_link', label: 'Mở đặt lịch', href });
    }
  }

  private uniqueActions(actions: UiActionDto[]): UiActionDto[] {
    const seen = new Set<string>();
    return actions.filter((a) => {
      const key = `${a.type}:${a.label}:${a.href ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
