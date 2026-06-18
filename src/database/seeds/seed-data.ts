import { Gender } from 'src/modules/user/enums/gender.enum';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';
import { BranchStatus } from 'src/modules/branch/enums/branch-status.enum';
import { ServiceStatus } from 'src/modules/service/enums/service-status.enum';
import { InventoryItemStatus } from 'src/modules/inventory/enums/inventory-item-status.enum';
import { DiscountType } from 'src/modules/promotion/enums/discount-type.enum';
import { DiscountCodeStatus } from 'src/modules/promotion/enums/discount-code-status.enum';
import { PromotionStatus } from 'src/modules/promotion/enums/promotion-status.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { BookingSource } from 'src/modules/booking/enums/booking-source.enum';
import { TreatmentCourseStatus } from 'src/modules/treatment/enums/treatment-course-status.enum';
import { TreatmentSessionStatus } from 'src/modules/treatment/enums/treatment-session-status.enum';
import { ScheduleRequestType } from 'src/modules/schedule/enums/schedule-request-type.enum';
import { ApprovalStatus } from 'src/modules/schedule/enums/approval-status.enum';
import { ComplaintStatus } from 'src/modules/communication/enums/complaint-status.enum';

// ── Users ─────────────────────────────────────────────────────────────────────

export const OWNER = {
  email: 'owner@gmail.com',
  password: '12345678qwerty',
  fullName: 'System Owner',
};

export const CUSTOMERS = [
  { fullName: 'Nguyen Thi Lan', email: 'lan.nguyen@gmail.com', phone: '0901111001', gender: Gender.Female },
  { fullName: 'Tran Van Minh', email: 'minh.tran@gmail.com', phone: '0901111002', gender: Gender.Male },
  { fullName: 'Le Thi Hoa', email: 'hoa.le@gmail.com', phone: '0901111003', gender: Gender.Female },
  { fullName: 'Pham Quoc Bao', email: 'bao.pham@gmail.com', phone: '0901111004', gender: Gender.Male },
  { fullName: 'Hoang Thi Mai', email: 'mai.hoang@gmail.com', phone: '0901111005', gender: Gender.Female },
];

export const STAFF = [
  { fullName: 'Vo Thi Thu', email: 'thu.vo@aura-spa.com', phone: '0902222001', gender: Gender.Female },
  { fullName: 'Nguyen Van Duc', email: 'duc.nguyen@aura-spa.com', phone: '0902222002', gender: Gender.Male },
  { fullName: 'Tran Thi Bich', email: 'bich.tran@aura-spa.com', phone: '0902222003', gender: Gender.Female },
];

// ── Branches ──────────────────────────────────────────────────────────────────

export const BRANCHES = [
  {
    code: 'HCM-Q1',
    name: 'Aura Spa – Quận 1',
    address: '123 Nguyen Hue, Phuong Ben Nghe, Quan 1',
    city: 'Ho Chi Minh City',
    district: 'Quan 1',
    latitude: 10.77609,
    longitude: 106.70295,
    phone: '0283001001',
    status: BranchStatus.Active,
  },
  {
    code: 'HCM-Q7',
    name: 'Aura Spa – Quận 7',
    address: '456 Nguyen Thi Thap, Phuong Tan Phu, Quan 7',
    city: 'Ho Chi Minh City',
    district: 'Quan 7',
    latitude: 10.73038,
    longitude: 106.72186,
    phone: '0283001002',
    status: BranchStatus.Active,
  },
  {
    code: 'HAN-HK',
    name: 'Aura Spa – Hoàn Kiếm',
    address: '78 Hang Bai, Phuong Tran Hung Dao, Quan Hoan Kiem',
    city: 'Hanoi',
    district: 'Hoan Kiem',
    latitude: 21.02437,
    longitude: 105.84422,
    phone: '0243001001',
    status: BranchStatus.Active,
  },
];

// ── Services ──────────────────────────────────────────────────────────────────

export const SERVICES = [
  {
    code: 'SVC-FACIAL-001',
    name: 'Chăm sóc da mặt cơ bản',
    slug: 'cham-soc-da-mat-co-ban',
    category: 'Facial',
    description: 'Làm sạch, tẩy tế bào chết và dưỡng ẩm chuyên sâu cho da mặt.',
    defaultDurationMinutes: 60,
    defaultPrice: 350000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-FACIAL-002',
    name: 'Trị liệu da chuyên sâu',
    slug: 'tri-lieu-da-chuyen-sau',
    category: 'Facial',
    description: 'Liệu trình trị liệu da chuyên sâu dành cho da nhạy cảm và da dầu.',
    defaultDurationMinutes: 90,
    defaultPrice: 650000,
    status: ServiceStatus.Active,
    isMultiSession: true,
    totalSessions: 5,
  },
  {
    code: 'SVC-BODY-001',
    name: 'Massage body thư giãn',
    slug: 'massage-body-thu-gian',
    category: 'Body',
    description: 'Massage toàn thân kết hợp tinh dầu thiên nhiên giúp thư giãn và giảm căng thẳng.',
    defaultDurationMinutes: 90,
    defaultPrice: 500000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-BODY-002',
    name: 'Tắm trắng toàn thân',
    slug: 'tam-trang-toan-than',
    category: 'Body',
    description: 'Liệu trình tắm trắng toàn thân bằng công nghệ hiện đại.',
    defaultDurationMinutes: 120,
    defaultPrice: 800000,
    status: ServiceStatus.Active,
    isMultiSession: true,
    totalSessions: 10,
  },
  {
    code: 'SVC-NAIL-001',
    name: 'Làm nail cơ bản',
    slug: 'lam-nail-co-ban',
    category: 'Nail',
    description: 'Chăm sóc móng tay và chân, sơn gel bền màu.',
    defaultDurationMinutes: 45,
    defaultPrice: 200000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
];

// ── Branch setup ──────────────────────────────────────────────────────────────

export const STAFF_ASSIGNMENTS = [
  { email: 'thu.vo@aura-spa.com', branchCode: 'HCM-Q1', staffCode: 'STF-HCM-Q1-001', position: StaffPosition.Technician },
  { email: 'duc.nguyen@aura-spa.com', branchCode: 'HCM-Q7', staffCode: 'STF-HCM-Q7-001', position: StaffPosition.Technician },
  { email: 'bich.tran@aura-spa.com', branchCode: 'HAN-HK', staffCode: 'STF-HAN-HK-001', position: StaffPosition.Technician },
];

// ── Bookings ──────────────────────────────────────────────────────────────────

export const DEMO_BOOKINGS = [
  {
    customerEmail: 'lan.nguyen@gmail.com',
    branchCode: 'HCM-Q1',
    technicianEmail: 'thu.vo@aura-spa.com',
    serviceCode: 'SVC-FACIAL-001',
    startTime: new Date('2026-06-02T10:00:00+07:00'),
    endTime: new Date('2026-06-02T11:00:00+07:00'),
    price: 350000,
    durationMinutes: 60,
  },
  {
    customerEmail: 'minh.tran@gmail.com',
    branchCode: 'HCM-Q7',
    technicianEmail: 'duc.nguyen@aura-spa.com',
    serviceCode: 'SVC-BODY-001',
    startTime: new Date('2026-06-03T14:00:00+07:00'),
    endTime: new Date('2026-06-03T15:30:00+07:00'),
    price: 500000,
    durationMinutes: 90,
  },
  {
    customerEmail: 'hoa.le@gmail.com',
    branchCode: 'HAN-HK',
    technicianEmail: 'bich.tran@aura-spa.com',
    serviceCode: 'SVC-NAIL-001',
    startTime: new Date('2026-06-05T11:00:00+07:00'),
    endTime: new Date('2026-06-05T11:45:00+07:00'),
    price: 200000,
    durationMinutes: 45,
  },
];

// ── Reviews ───────────────────────────────────────────────────────────────────

export const REVIEW_DEFS = [
  {
    customerEmail: 'lan.nguyen@gmail.com',
    rating: 5,
    comment: 'Dịch vụ chăm sóc da rất tốt, da mình mịn màng hơn rõ rệt. Nhân viên nhiệt tình và chuyên nghiệp!',
  },
  {
    customerEmail: 'minh.tran@gmail.com',
    rating: 4,
    comment: 'Massage rất thư giãn, không gian spa sạch sẽ và thoáng mát. Sẽ quay lại lần sau.',
  },
  {
    customerEmail: 'hoa.le@gmail.com',
    rating: 5,
    comment: 'Làm nail rất đẹp, nhân viên tỉ mỉ và cẩn thận. Rất hài lòng!',
  },
];

// ── Health records ────────────────────────────────────────────────────────────

export const HEALTH_DEFS = [
  {
    customerEmail: 'lan.nguyen@gmail.com',
    branchCode: 'HCM-Q1',
    skinType: 'Da thường',
    allergies: null,
    medicalConditions: null,
    pregnancyStatus: 'Không',
    contraindications: null,
    notes: 'Khách thích sản phẩm dịu nhẹ, không mùi mạnh.',
  },
  {
    customerEmail: 'hoa.le@gmail.com',
    branchCode: 'HAN-HK',
    skinType: 'Da nhạy cảm',
    allergies: 'Dị ứng nhẹ với nước hoa tổng hợp',
    medicalConditions: null,
    pregnancyStatus: 'Không',
    contraindications: 'Tránh dùng sản phẩm có cồn và hương liệu mạnh',
    notes: null,
  },
];

// ── Inventory ─────────────────────────────────────────────────────────────────

export const INVENTORY_ITEMS = [
  {
    sku: 'INV-SERUM-001',
    name: 'Vitamin C Serum dưỡng trắng',
    unit: 'chai',
    category: 'Facial',
    minStockLevel: 10,
    status: InventoryItemStatus.Active,
    stockByBranch: { 'HCM-Q1': 25, 'HCM-Q7': 18, 'HAN-HK': 12 },
  },
  {
    sku: 'INV-TONER-001',
    name: 'Nước hoa hồng dưỡng ẩm',
    unit: 'chai',
    category: 'Facial',
    minStockLevel: 8,
    status: InventoryItemStatus.Active,
    stockByBranch: { 'HCM-Q1': 20, 'HCM-Q7': 15, 'HAN-HK': 10 },
  },
  {
    sku: 'INV-OIL-001',
    name: 'Tinh dầu massage lavender',
    unit: 'chai',
    category: 'Body',
    minStockLevel: 5,
    status: InventoryItemStatus.Active,
    stockByBranch: { 'HCM-Q1': 12, 'HCM-Q7': 10, 'HAN-HK': 8 },
  },
  {
    sku: 'INV-NAIL-001',
    name: 'Sơn gel màu cao cấp',
    unit: 'lọ',
    category: 'Nail',
    minStockLevel: 20,
    status: InventoryItemStatus.Active,
    stockByBranch: { 'HCM-Q1': 50, 'HCM-Q7': 40, 'HAN-HK': 35 },
  },
];

// ── Promotions (UC07) ─────────────────────────────────────────────────────────
// Dates are relative to runtime so the promotions are always valid when seeded.

const daysFromNow = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// slotAt: date N days from now at a specific Vietnam local hour (UTC+7)
const slotAt = (days: number, hourVN: number): Date => {
  const d = daysFromNow(days);
  d.setUTCHours(hourVN - 7, 0, 0, 0);
  return d;
};

export const PROMOTIONS = [
  {
    code: 'WELCOME-ACTIVE',
    name: 'Khuyến mãi chào mừng',
    description: 'Giảm 20% tất cả dịch vụ chăm sóc da. Áp dụng toàn hệ thống.',
    branchCode: null, // system-wide
    discountType: DiscountType.Percentage,
    discountValue: 20,
    maxDiscountAmount: 200000,
    minOrderAmount: 300000,
    usageLimitTotal: 500,
    usageLimitPerCustomer: 2,
    startsAt: daysFromNow(-30), // started 30 days ago
    endsAt: daysFromNow(60), // ends 60 days from now
    status: PromotionStatus.Active,
  },
  {
    code: 'HCM-Q1-WELCOME',
    name: 'Ưu đãi chào mừng – Chi nhánh Quận 1',
    description: 'Giảm 100.000đ cho lần đầu trải nghiệm dịch vụ tại chi nhánh Quận 1.',
    branchCode: 'HCM-Q1',
    discountType: DiscountType.FixedAmount,
    discountValue: 100000,
    maxDiscountAmount: null,
    minOrderAmount: 200000,
    usageLimitTotal: 100,
    usageLimitPerCustomer: 1,
    startsAt: daysFromNow(-15),
    endsAt: daysFromNow(45),
    status: PromotionStatus.Active,
  },
  {
    code: 'SKINCARE-UPCOMING',
    name: 'Gói chăm sóc da chuyên sâu',
    description: 'Giảm 15% cho các liệu trình chăm sóc da chuyên sâu. Sắp ra mắt.',
    branchCode: null,
    discountType: DiscountType.Percentage,
    discountValue: 15,
    maxDiscountAmount: 150000,
    minOrderAmount: 500000,
    usageLimitTotal: 200,
    usageLimitPerCustomer: 3,
    startsAt: daysFromNow(15), // starts 15 days from now
    endsAt: daysFromNow(105),
    status: PromotionStatus.Draft,
  },
];

// ── Discount codes (UC14) ─────────────────────────────────────────────────────

export const DISCOUNT_CODES = [
  {
    promotionCode: 'WELCOME-ACTIVE',
    code: 'WELCOME2026',
    usageLimitTotal: 500,
    usageLimitPerCustomer: 2,
    status: DiscountCodeStatus.Active,
  },
  {
    promotionCode: 'HCM-Q1-WELCOME',
    code: 'Q1FIRST',
    usageLimitTotal: 100,
    usageLimitPerCustomer: 1,
    status: DiscountCodeStatus.Active,
  },
];

// ── Upcoming bookings (UC10) ──────────────────────────────────────────────────
// Future confirmed bookings — relative dates so they are always upcoming.

export const UPCOMING_BOOKINGS = [
  {
    customerEmail: 'lan.nguyen@gmail.com',
    branchCode: 'HCM-Q1',
    technicianEmail: 'thu.vo@aura-spa.com',
    serviceCode: 'SVC-FACIAL-001',
    startTime: slotAt(3, 10),
    durationMinutes: 60,
    price: 350000,
  },
  {
    customerEmail: 'bao.pham@gmail.com',
    branchCode: 'HCM-Q7',
    technicianEmail: 'duc.nguyen@aura-spa.com',
    serviceCode: 'SVC-BODY-001',
    startTime: slotAt(5, 14),
    durationMinutes: 90,
    price: 500000,
  },
  {
    customerEmail: 'mai.hoang@gmail.com',
    branchCode: 'HAN-HK',
    technicianEmail: 'bich.tran@aura-spa.com',
    serviceCode: 'SVC-NAIL-001',
    startTime: slotAt(7, 9),
    durationMinutes: 45,
    price: 200000,
  },
];

// ── Rescheduled pair (UC11) ───────────────────────────────────────────────────

export const RESCHEDULED_PAIR = {
  original: {
    customerEmail: 'hoa.le@gmail.com',
    branchCode: 'HAN-HK',
    technicianEmail: 'bich.tran@aura-spa.com',
    serviceCode: 'SVC-NAIL-001',
    startTime: slotAt(-3, 11),
    durationMinutes: 45,
    price: 200000,
    status: BookingStatus.Rescheduled,
  },
  rescheduled: {
    customerEmail: 'hoa.le@gmail.com',
    branchCode: 'HAN-HK',
    technicianEmail: 'bich.tran@aura-spa.com',
    serviceCode: 'SVC-NAIL-001',
    startTime: slotAt(4, 11),
    durationMinutes: 45,
    price: 200000,
    status: BookingStatus.Confirmed,
  },
};

// ── Cancelled booking (UC12) ──────────────────────────────────────────────────

export const CANCELLED_BOOKING = {
  customerEmail: 'minh.tran@gmail.com',
  branchCode: 'HCM-Q7',
  technicianEmail: null as string | null,
  serviceCode: 'SVC-FACIAL-002',
  startTime: slotAt(10, 14),
  durationMinutes: 90,
  price: 650000,
  status: BookingStatus.Cancelled,
  cancelReason: 'Thay đổi kế hoạch, sẽ đặt lại sau',
  cancelledAt: daysFromNow(-1),
};

// ── Transferred pair (UC13) ───────────────────────────────────────────────────

export const TRANSFERRED_PAIR = {
  original: {
    customerEmail: 'mai.hoang@gmail.com',
    branchCode: 'HCM-Q1',
    technicianEmail: 'thu.vo@aura-spa.com',
    serviceCode: 'SVC-FACIAL-001',
    startTime: slotAt(14, 10),
    durationMinutes: 60,
    price: 350000,
    status: BookingStatus.Transferred,
  },
  transferred: {
    customerEmail: 'mai.hoang@gmail.com',
    branchCode: 'HCM-Q7',
    technicianEmail: 'duc.nguyen@aura-spa.com',
    serviceCode: 'SVC-FACIAL-001',
    startTime: slotAt(14, 15),
    durationMinutes: 60,
    price: 350000,
    status: BookingStatus.Confirmed,
    transferredFromBranchCode: 'HCM-Q1',
  },
};

// ── Conversations (UC08) ──────────────────────────────────────────────────────

export const DEMO_CONVERSATIONS = [
  {
    guestName: 'Nguyen Thi Tuyet',
    guestEmail: 'tuyet.nguyen@gmail.com',
    guestPhone: '0909111222',
    branchCode: null, // system-wide inquiry
    subject: 'Hỏi về gói liệu trình chăm sóc da mặt',
    initialMessage: 'Chào spa, mình muốn hỏi thêm về gói liệu trình chăm sóc da mặt chuyên sâu. Liệu trình gồm mấy buổi và giá bao nhiêu ạ?',
    staffReply: null, // open, no reply yet
  },
  {
    guestName: 'Le Van Khoa',
    guestEmail: 'khoa.le@gmail.com',
    guestPhone: '0912333444',
    branchCode: 'HCM-Q7',
    subject: 'Hỏi về giá dịch vụ massage',
    initialMessage: 'Cho mình hỏi dịch vụ massage body tại chi nhánh Quận 7 giá bao nhiêu và có cần đặt trước không ạ?',
    staffReply: {
      staffEmail: 'duc.nguyen@aura-spa.com',
      message:
        'Chào bạn! Dịch vụ massage body thư giãn tại Quận 7 có giá 500.000đ/90 phút. ' +
        'Bạn nên đặt lịch trước để đảm bảo có chỗ, đặc biệt vào cuối tuần. ' +
        'Bạn có thể đặt qua ứng dụng hoặc gọi trực tiếp cho chúng mình nhé!',
    },
  },
  {
    guestName: 'Pham Thi Hong',
    guestEmail: 'hong.pham@gmail.com',
    guestPhone: '0933555666',
    branchCode: 'HAN-HK',
    subject: 'Hỏi quy trình đặt lịch và thanh toán',
    initialMessage: 'Mình muốn hỏi quy trình đặt lịch và hình thức thanh toán tại spa như thế nào ạ? Có chấp nhận thanh toán qua thẻ không?',
    staffReply: {
      staffEmail: 'bich.tran@aura-spa.com',
      message:
        'Chào bạn! Để đặt lịch, bạn đăng ký tài khoản trên ứng dụng và chọn dịch vụ, chi nhánh, khung giờ phù hợp. ' +
        'Về thanh toán, spa chấp nhận tiền mặt, chuyển khoản và thẻ tín dụng/ghi nợ. Bạn cần hỗ trợ thêm gì không ạ?',
    },
  },
];

// ── Checked-in booking (UC18) ─────────────────────────────────────────────────

export const CHECKED_IN_BOOKING = {
  customerEmail: 'minh.tran@gmail.com',
  branchCode: 'HCM-Q1',
  technicianEmail: 'thu.vo@aura-spa.com',
  serviceCode: 'SVC-FACIAL-001',
  startTime: slotAt(0, 9),
  durationMinutes: 60,
  price: 350000,
  status: BookingStatus.CheckedIn,
  source: BookingSource.Online,
  checkedInAt: slotAt(0, 9),
};

// ── Walk-in booking (UC19) ────────────────────────────────────────────────────

export const WALK_IN_BOOKING = {
  customerEmail: 'bao.pham@gmail.com',
  branchCode: 'HCM-Q1',
  technicianEmail: 'thu.vo@aura-spa.com',
  serviceCode: 'SVC-NAIL-001',
  startTime: slotAt(0, 10),
  durationMinutes: 45,
  price: 200000,
  status: BookingStatus.Completed,
  source: BookingSource.WalkIn,
  checkedInAt: slotAt(0, 10),
  completedAt: new Date(slotAt(0, 10).getTime() + 45 * 60 * 1000),
};

// ── Staff schedules (UC21 / UC22) ─────────────────────────────────────────────

export const SCHEDULE_DEFS = [
  {
    staffEmail: 'thu.vo@aura-spa.com',
    branchCode: 'HCM-Q1',
    requests: [
      {
        requestType: ScheduleRequestType.WorkShift,
        requestedStart: slotAt(0, 8),
        requestedEnd: slotAt(7, 18),
        status: ApprovalStatus.Approved,
        reason: 'Ca làm việc tuần này',
        shiftDays: [0, 1, 2, 3, 4, 5, 6, 7],
      },
    ],
  },
  {
    staffEmail: 'duc.nguyen@aura-spa.com',
    branchCode: 'HCM-Q7',
    requests: [
      {
        requestType: ScheduleRequestType.WorkShift,
        requestedStart: slotAt(0, 8),
        requestedEnd: slotAt(7, 18),
        status: ApprovalStatus.Approved,
        reason: 'Ca làm việc tuần này',
        shiftDays: [0, 1, 2, 3, 4, 5, 6, 7],
      },
    ],
  },
  {
    staffEmail: 'bich.tran@aura-spa.com',
    branchCode: 'HAN-HK',
    requests: [
      {
        requestType: ScheduleRequestType.WorkShift,
        requestedStart: slotAt(0, 8),
        requestedEnd: slotAt(7, 18),
        status: ApprovalStatus.Approved,
        reason: 'Ca làm việc tuần này',
        shiftDays: [0, 1, 2, 3, 4, 5, 6, 7],
      },
      {
        requestType: ScheduleRequestType.DayOff,
        requestedStart: slotAt(8, 8),
        requestedEnd: slotAt(9, 18),
        status: ApprovalStatus.Pending,
        reason: 'Xin nghỉ cuối tuần tới',
        shiftDays: [],
      },
    ],
  },
];

// ── Treatment courses + sessions (UC16) ───────────────────────────────────────

export const TREATMENT_COURSE_DEFS = [
  {
    customerEmail: 'lan.nguyen@gmail.com',
    branchCode: 'HCM-Q1',
    serviceCode: 'SVC-FACIAL-002',
    totalSessions: 5,
    usedSessions: 2,
    remainingSessions: 3,
    status: TreatmentCourseStatus.Active,
    startedAt: daysFromNow(-20),
    expiresAt: daysFromNow(160),
    sessions: [
      {
        sessionNumber: 1,
        status: TreatmentSessionStatus.Completed,
        technicianEmail: 'thu.vo@aura-spa.com',
        progressNote: 'Buổi 1: Da phản ứng tốt, giảm mụn viêm rõ rệt sau liệu trình.',
        completedAt: daysFromNow(-20),
      },
      {
        sessionNumber: 2,
        status: TreatmentSessionStatus.Completed,
        technicianEmail: 'thu.vo@aura-spa.com',
        progressNote: 'Buổi 2: Độ ẩm da tăng đáng kể, lỗ chân lông se khít hơn.',
        completedAt: daysFromNow(-10),
      },
      {
        sessionNumber: 3,
        status: TreatmentSessionStatus.Booked,
        technicianEmail: 'thu.vo@aura-spa.com',
        progressNote: null,
        completedAt: null,
      },
      {
        sessionNumber: 4,
        status: TreatmentSessionStatus.Planned,
        technicianEmail: null,
        progressNote: null,
        completedAt: null,
      },
      {
        sessionNumber: 5,
        status: TreatmentSessionStatus.Planned,
        technicianEmail: null,
        progressNote: null,
        completedAt: null,
      },
    ],
  },
  {
    customerEmail: 'bao.pham@gmail.com',
    branchCode: 'HCM-Q7',
    serviceCode: 'SVC-BODY-002',
    totalSessions: 10,
    usedSessions: 1,
    remainingSessions: 9,
    status: TreatmentCourseStatus.Active,
    startedAt: daysFromNow(-7),
    expiresAt: daysFromNow(173),
    sessions: [
      {
        sessionNumber: 1,
        status: TreatmentSessionStatus.Completed,
        technicianEmail: 'duc.nguyen@aura-spa.com',
        progressNote: 'Buổi khởi động: Da đều màu hơn, khách phản hồi tích cực.',
        completedAt: daysFromNow(-7),
      },
      {
        sessionNumber: 2,
        status: TreatmentSessionStatus.Booked,
        technicianEmail: 'duc.nguyen@aura-spa.com',
        progressNote: null,
        completedAt: null,
      },
      {
        sessionNumber: 3,
        status: TreatmentSessionStatus.Planned,
        technicianEmail: null,
        progressNote: null,
        completedAt: null,
      },
      {
        sessionNumber: 4,
        status: TreatmentSessionStatus.Planned,
        technicianEmail: null,
        progressNote: null,
        completedAt: null,
      },
      {
        sessionNumber: 5,
        status: TreatmentSessionStatus.Planned,
        technicianEmail: null,
        progressNote: null,
        completedAt: null,
      },
    ],
  },
];

// ── Complaints ────────────────────────────────────────────────────────────────

export const COMPLAINT_DEFS = [
  {
    customerEmail: 'minh.tran@gmail.com',
    branchCode: 'HCM-Q1',
    title: 'Technician arrived late',
    description: 'My appointment was at 9:00 AM but the technician only started at 9:30 AM without any notice. This caused me to be late for work.',
    status: ComplaintStatus.Open,
    resolutionNote: null as string | null,
    resolvedAt: null as Date | null,
  },
  {
    customerEmail: 'lan.nguyen@gmail.com',
    branchCode: 'HCM-Q1',
    title: 'Product caused skin irritation',
    description: 'After the facial treatment, I developed redness and irritation. I believe the product used was not suitable for my skin type.',
    status: ComplaintStatus.Open,
    resolutionNote: null as string | null,
    resolvedAt: null as Date | null,
  },
  {
    customerEmail: 'bao.pham@gmail.com',
    branchCode: 'HCM-Q1',
    title: 'Overcharged for service',
    description: 'I was charged 500,000 VND but the price listed on the menu was 350,000 VND. Please investigate.',
    status: ComplaintStatus.InProgress,
    resolutionNote: null as string | null,
    resolvedAt: null as Date | null,
  },
  {
    customerEmail: 'hoa.le@gmail.com',
    branchCode: 'HCM-Q7',
    title: 'Dirty towels used during treatment',
    description: 'The towels used during my massage session did not appear to be freshly laundered.',
    status: ComplaintStatus.Resolved,
    resolutionNote:
      'We sincerely apologize. We have reviewed our linen management process and provided additional training to our housekeeping staff.',
    resolvedAt: new Date(),
  },
];
