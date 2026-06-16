import { Gender } from 'src/modules/user/enums/gender.enum';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';
import { BranchStatus } from 'src/modules/branch/enums/branch-status.enum';
import { ServiceStatus } from 'src/modules/service/enums/service-status.enum';
import { InventoryItemStatus } from 'src/modules/inventory/enums/inventory-item-status.enum';

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
