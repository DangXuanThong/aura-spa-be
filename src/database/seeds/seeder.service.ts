import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { ServiceStatus } from 'src/modules/service/enums/service-status.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { ConfigService } from '@nestjs/config';
import { BranchSetupSeeder } from './branch-setup.seeder';
import { BookingSeeder } from './booking.seeder';
import { PaymentSeeder } from './payment.seeder';
import { ReviewSeeder } from './review.seeder';
import { HealthSeeder } from './health.seeder';
import { InventorySeeder } from './inventory.seeder';
import { PromotionSeeder } from './promotion.seeder';
import { DiscountCodeSeeder } from './discount-code.seeder';
import { TreatmentSeeder } from './treatment.seeder';
import { ConversationSeeder } from './conversation.seeder';
import { ComplaintSeeder } from './complaint.seeder';
import { ScheduleSeeder } from './schedule.seeder';
import { PerformanceDataSeeder } from './performance-data.seeder';
import { OWNER, CUSTOMERS, STAFF, MANAGERS, BRANCHES, SERVICES } from './seed-data';

/* eslint-disable max-len -- External image URLs are opaque provider-generated values. */
const MASSAGE_IMAGE = 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1200&q=85';
const FACIAL_IMAGE = 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85';
const WELLNESS_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCm_drm21aKgARIN6cbluYOTLae7X7hdcc6zfRCBz4fbAwam5NbcMAGruyiwBUzRptvuHzW1jydIqiyO1ISxqpBUKOlyNYpQRGWXN_Qo-UPflyeE2x253FCaHL-xgHPDgbZmHq7C7G4T4wI2qv4tEilcqDDfvyxmWkXI7qaqUdiJioYHvvNLgRl7XlEyP7bTW7WlAXPfsdOJeFxCX97OCvZfhYGFizo1mEguppmk6ZNaq_HdZ4qWvpoAhYo5rcxhfwfcJwS5e9dpJ8';
const COUPLE_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC3ABZQOib4ahsVNToef3M5aX7h8HSD5iv-ZgCnqWTrvpkS6aTZMkdlB8-xs-Liu42swcMJIf2yTJ1-6pZUiX3faYcvl3ZGrHZIQGJbTCB34f9Bx3C6IeFWEO_NciiKa5f7AYR1OquqoWPK94usP9aIpYDamSbgHO86rPz2mF6P-NVn-KqrusGn0ND-mEEp6wdbJoYqud9yFjRY3y136ERm9wWZviyXZXqysa6TQCVFed_tO35FLQwdJ9t4xaUoXFfovQiorIraCag';
/* eslint-enable max-len */

const SERVICE_PRESENTATION_OVERRIDES: Record<string, Partial<Service>> = {
  'SVC-FACIAL-001': {
    name: 'Cấp Ẩm Chuyên Sâu Radiance',
    slug: 'cap-am-chuyen-sau-radiance',
    category: 'Facial',
    description: 'Khôi phục độ ẩm tự nhiên của da bằng tinh chất HA và vitamin, mang lại làn da căng bóng và rạng rỡ ngay lập tức.',
    imageUrl: FACIAL_IMAGE,
    defaultDurationMinutes: 60,
    defaultPrice: 1100000,
  },
  'SVC-FACIAL-002': {
    name: 'Trẻ Hóa Da Tế Bào Gốc',
    slug: 'tre-hoa-da-te-bao-goc',
    category: 'Facial',
    description: 'Liệu pháp chống lão hóa sử dụng ánh sáng sinh học và tế bào gốc thực vật quý hiếm để tái tạo làn da.',
    imageUrl: FACIAL_IMAGE,
    defaultDurationMinutes: 90,
    defaultPrice: 2400000,
  },
  'SVC-BODY-001': {
    name: 'Massage Đá Nóng Núi Lửa',
    slug: 'massage-da-nong-nui-lua',
    category: 'Massage',
    description: 'Năng lượng từ đá bazan nóng tác động sâu vào các huyệt đạo, giúp thải độc tố và xua tan mệt mỏi tích tụ.',
    imageUrl: MASSAGE_IMAGE,
    defaultDurationMinutes: 90,
    defaultPrice: 1500000,
  },
  'SVC-BODY-002': {
    name: 'Ủ Bùn Khoáng Thiên Nhiên',
    slug: 'u-bun-khoang-thien-nhien',
    category: 'Body',
    description: 'Cung cấp khoáng chất thiết yếu, giúp thải độc qua da và làm sáng mịn tông da toàn thân.',
    imageUrl: WELLNESS_IMAGE,
    defaultDurationMinutes: 60,
    defaultPrice: 1050000,
  },
  'SVC-NAIL-001': {
    name: 'Tẩy Tế Bào Chết Muối Biển',
    slug: 'tay-te-bao-chet-muoi-bien',
    category: 'Body',
    description: 'Làm mịn da và kích thích tái tạo tế bào mới với muối biển hạt mịn.',
    imageUrl: WELLNESS_IMAGE,
    defaultDurationMinutes: 45,
    defaultPrice: 850000,
  },
};

const ADDITIONAL_PRESENTATION_SERVICES: Partial<Service>[] = [
  {
    code: 'SVC-MASSAGE-002',
    name: 'Massage Thụy Điển Cổ Điển',
    slug: 'massage-thuy-dien-co-dien',
    category: 'Massage',
    description: 'Sự kết hợp giữa các động tác xoa bóp nhẹ nhàng và tinh dầu thiên nhiên giúp giảm căng thẳng cơ bắp.',
    imageUrl: MASSAGE_IMAGE,
    defaultDurationMinutes: 60,
    defaultPrice: 1200000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-MASSAGE-NECK-SHOULDER-001',
    name: 'Massage Cổ Vai Gáy Chuyên Sâu',
    slug: 'massage-co-vai-gay-chuyen-sau',
    category: 'Massage',
    description: 'Tập trung vùng cổ, vai và lưng trên cho khách ngồi máy tính nhiều, giúp giảm căng cơ và thư giãn đầu óc.',
    imageUrl: MASSAGE_IMAGE,
    defaultDurationMinutes: 45,
    defaultPrice: 650000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-MASSAGE-FOOT-HERBAL-001',
    name: 'Massage Chân Thảo Mộc',
    slug: 'massage-chan-thao-moc',
    category: 'Massage',
    description: 'Ngâm chân thảo mộc ấm kết hợp bấm huyệt nhẹ, phù hợp sau ngày dài di chuyển hoặc đứng nhiều.',
    imageUrl: MASSAGE_IMAGE,
    defaultDurationMinutes: 45,
    defaultPrice: 550000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-FACIAL-HYDRATION-BOOST-001',
    name: 'Facial Cấp Ẩm Nhanh Hydration Boost',
    slug: 'facial-cap-am-nhanh-hydration-boost',
    category: 'Facial',
    description: 'Làm sạch, cân bằng và cấp ẩm nhanh cho da thiếu nước, phù hợp khách cần phục hồi làn da trong thời gian ngắn.',
    imageUrl: FACIAL_IMAGE,
    defaultDurationMinutes: 50,
    defaultPrice: 780000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-BODY-GLOW-SCRUB-001',
    name: 'Tẩy Tế Bào Chết & Dưỡng Body Glow',
    slug: 'tay-te-bao-chet-duong-body-glow',
    category: 'Body',
    description: 'Làm sạch lớp sừng, dưỡng ẩm và hỗ trợ da cơ thể mềm mịn, đều màu hơn sau một buổi chăm sóc.',
    imageUrl: WELLNESS_IMAGE,
    defaultDurationMinutes: 60,
    defaultPrice: 880000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-PACKAGE-001',
    name: 'Gói "Tâm An" Serenity Journey',
    slug: 'goi-tam-an-serenity-journey',
    category: 'Package',
    description: 'Massage đá nóng 90 phút, chăm sóc da mặt Radiance 60 phút, trà thảo mộc và quà tặng tinh dầu Aura.',
    imageUrl: WELLNESS_IMAGE,
    defaultDurationMinutes: 180,
    defaultPrice: 3200000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-PACKAGE-002',
    name: 'Gói "Song Hành" Couples Retreat',
    slug: 'goi-song-hanh-couples-retreat',
    category: 'Package',
    description: 'Phòng VIP đôi, massage Thụy Điển 75 phút và tẩy tế bào chết toàn thân cho hai người.',
    imageUrl: COUPLE_IMAGE,
    defaultDurationMinutes: 180,
    defaultPrice: 5800000,
    status: ServiceStatus.Active,
    isMultiSession: false,
    totalSessions: null,
  },
  {
    code: 'SVC-TREATMENT-RADIANCE-001',
    name: 'Liệu trình phục hồi da Radiance',
    slug: 'lieu-trinh-phuc-hoi-da-radiance',
    category: 'Treatment',
    description:
      'Liệu trình 5 buổi dành cho da khô, xỉn màu và thiếu ẩm. Tập trung cấp ẩm sâu, phục hồi hàng rào bảo vệ da và cải thiện độ sáng mịn.',
    imageUrl: FACIAL_IMAGE,
    defaultDurationMinutes: 75,
    defaultPrice: 1250000,
    status: ServiceStatus.Active,
    isMultiSession: true,
    totalSessions: 5,
  },
  {
    code: 'SVC-TREATMENT-NECK-SHOULDER-001',
    name: 'Liệu trình giảm căng cơ cổ vai gáy',
    slug: 'lieu-trinh-giam-cang-co-co-vai-gay',
    category: 'Treatment',
    description:
      // eslint-disable-next-line max-len
      'Liệu trình 3 buổi cho dân văn phòng hoặc người ngồi máy tính nhiều. Kết hợp massage cổ vai gáy, giãn cơ và thư giãn thần kinh để giảm mỏi, hỗ trợ ngủ tốt hơn.',
    imageUrl: MASSAGE_IMAGE,
    defaultDurationMinutes: 60,
    defaultPrice: 900000,
    status: ServiceStatus.Active,
    isMultiSession: true,
    totalSessions: 3,
  },
  {
    code: 'SVC-TREATMENT-SERENITY-001',
    name: 'Liệu trình thư giãn toàn thân Serenity',
    slug: 'lieu-trinh-thu-gian-toan-than-serenity',
    category: 'Treatment',
    description: 'Liệu trình 4 buổi sử dụng massage Thụy Điển và hương liệu nhẹ cho khách stress, mất ngủ nhẹ hoặc cần phục hồi năng lượng.',
    imageUrl: MASSAGE_IMAGE,
    defaultDurationMinutes: 90,
    defaultPrice: 1350000,
    status: ServiceStatus.Active,
    isMultiSession: true,
    totalSessions: 4,
  },
  {
    code: 'SVC-TREATMENT-COUPLE-RETREAT-001',
    name: 'Liệu trình Couple Retreat',
    slug: 'lieu-trinh-couple-retreat',
    category: 'Treatment',
    description: 'Liệu trình 2 buổi dành cho cặp đôi hoặc khách muốn trải nghiệm thư giãn cùng người thân trong không gian riêng tư, cao cấp.',
    imageUrl: COUPLE_IMAGE,
    defaultDurationMinutes: 120,
    defaultPrice: 2600000,
    status: ServiceStatus.Active,
    isMultiSession: true,
    totalSessions: 2,
  },
];

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    private readonly configService: ConfigService,
    private readonly branchSetupSeeder: BranchSetupSeeder,
    private readonly bookingSeeder: BookingSeeder,
    private readonly paymentSeeder: PaymentSeeder,
    private readonly reviewSeeder: ReviewSeeder,
    private readonly healthSeeder: HealthSeeder,
    private readonly inventorySeeder: InventorySeeder,
    private readonly promotionSeeder: PromotionSeeder,
    private readonly discountCodeSeeder: DiscountCodeSeeder,
    private readonly treatmentSeeder: TreatmentSeeder,
    private readonly conversationSeeder: ConversationSeeder,
    private readonly complaintSeeder: ComplaintSeeder,
    private readonly scheduleSeeder: ScheduleSeeder,
    private readonly performanceDataSeeder: PerformanceDataSeeder,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get('NODE_ENV') === 'production') return;
    await this.seedOwnerAccount();
    await this.seedCustomers();
    await this.seedStaff();
    await this.seedManagers();
    await this.seedBranches();
    await this.seedServices();
    await this.seedServicePresentation();
    await this.branchSetupSeeder.seed();
    await this.bookingSeeder.seed();
    await this.paymentSeeder.seed();
    await this.reviewSeeder.seed();
    await this.healthSeeder.seed();
    await this.inventorySeeder.seed();
    await this.promotionSeeder.seed();
    await this.discountCodeSeeder.seed();
    await this.treatmentSeeder.seed();
    await this.conversationSeeder.seed();
    await this.complaintSeeder.seed();
    await this.scheduleSeeder.seed();
    await this.performanceDataSeeder.seed();
    await this.seedDynamicRostersAndReviews();
  }

  // ── Owner ────────────────────────────────────────────────────────────────

  private async seedOwnerAccount(): Promise<void> {
    const existing = await this.userRepository.findOne({ where: { email: OWNER.email } });
    if (existing) {
      this.logger.log(`Owner already exists — skipping (${OWNER.email})`);
      return;
    }

    await this.userRepository.save(
      this.userRepository.create({
        email: OWNER.email,
        fullName: OWNER.fullName,
        passwordHash: await bcrypt.hash(OWNER.password, 12),
        role: UserRole.Owner,
        status: UserStatus.Active,
        authProvider: AuthProvider.Email,
        gender: Gender.Unknown,
        phone: null,
        avatarUrl: null,
        dateOfBirth: null,
        address: null,
      }),
    );

    this.logger.log(`Owner seeded (${OWNER.email})`);
  }

  // ── Customers ────────────────────────────────────────────────────────────

  private async seedCustomers(): Promise<void> {
    const passwordHash = await bcrypt.hash('Customer123!', 12);
    let seeded = 0;

    for (const c of CUSTOMERS) {
      const exists = await this.userRepository.findOne({ where: { email: c.email } });
      if (exists) continue;

      await this.userRepository.save(
        this.userRepository.create({
          ...c,
          passwordHash,
          role: UserRole.Customer,
          status: UserStatus.Active,
          authProvider: AuthProvider.Email,
          avatarUrl: null,
          dateOfBirth: null,
          address: null,
        }),
      );
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} customer(s)`);
    else this.logger.log('Customers already exist — skipping');
  }

  // ── Staff ────────────────────────────────────────────────────────────────

  private async seedStaff(): Promise<void> {
    const passwordHash = await bcrypt.hash('Staff123!', 12);
    let seeded = 0;

    for (const s of STAFF) {
      const exists = await this.userRepository.findOne({ where: { email: s.email } });
      if (exists) continue;

      await this.userRepository.save(
        this.userRepository.create({
          ...s,
          passwordHash,
          role: UserRole.Staff,
          status: UserStatus.Active,
          authProvider: AuthProvider.Email,
          avatarUrl: null,
          dateOfBirth: null,
          address: null,
        }),
      );
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} staff member(s)`);
    else this.logger.log('Staff already exist — skipping');
  }

  // ── Managers (UC26–31) ────────────────────────────────────────────────────

  private async seedManagers(): Promise<void> {
    const passwordHash = await bcrypt.hash('Manager123!', 12);
    let seeded = 0;

    for (const m of MANAGERS) {
      const exists = await this.userRepository.findOne({ where: { email: m.email } });
      if (exists) continue;

      await this.userRepository.save(
        this.userRepository.create({
          ...m,
          passwordHash,
          role: UserRole.Manager,
          status: UserStatus.Active,
          authProvider: AuthProvider.Email,
          avatarUrl: null,
          dateOfBirth: null,
          address: null,
        }),
      );
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} manager(s)`);
    else this.logger.log('Managers already exist — skipping');
  }

  // ── Branches ─────────────────────────────────────────────────────────────

  private async seedBranches(): Promise<void> {
    let seeded = 0;

    for (const b of BRANCHES) {
      const exists = await this.branchRepository.findOne({ where: { code: b.code } });
      if (exists) continue;

      await this.branchRepository.save(this.branchRepository.create(b));
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} branch(es)`);
    else this.logger.log('Branches already exist — skipping');
  }

  // ── Services ─────────────────────────────────────────────────────────────

  private async seedServices(): Promise<void> {
    let seeded = 0;

    for (const s of SERVICES) {
      const exists = await this.serviceRepository.findOne({ where: [{ code: s.code }, { slug: s.slug }] });
      if (exists) continue;

      await this.serviceRepository.save(this.serviceRepository.create(s));
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} service(s)`);
    else this.logger.log('Services already exist — skipping');
  }

  private async seedServicePresentation(): Promise<void> {
    let seeded = 0;
    let updated = 0;

    for (const service of ADDITIONAL_PRESENTATION_SERVICES) {
      if (!service.code) continue;

      const exists = await this.serviceRepository.findOne({ where: { code: service.code } });
      if (exists) continue;

      await this.serviceRepository.save(this.serviceRepository.create(service));
      seeded++;
    }

    for (const [code, presentation] of Object.entries(SERVICE_PRESENTATION_OVERRIDES)) {
      const service = await this.serviceRepository.findOne({ where: { code } });
      if (!service) continue;
      if (presentation.slug && service.slug === presentation.slug) continue;

      try {
        await this.serviceRepository.save({ ...service, ...presentation });
        updated++;
      } catch (e: any) {
        const pgCode = e?.code ?? e?.driverError?.code;
        if (pgCode === '23505') {
          this.logger.warn(`Skipping presentation update for ${code}: slug already taken by another row`);
          continue;
        }
        throw e;
      }
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} presentation service(s)`);
    if (updated > 0) this.logger.log(`Updated ${updated} service presentation record(s)`);
  }

  private async seedDynamicRostersAndReviews(): Promise<void> {
    const queryRunner = this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log('Seeding dynamic rosters and reviews for all branches...');

      const pwdRes = await queryRunner.query("SELECT password_hash FROM users WHERE role = 'staff' LIMIT 1");
      const passwordHash = pwdRes[0]?.password_hash || (await bcrypt.hash('Staff123!', 12));

      const branches = await queryRunner.query('SELECT id, name, code FROM branches');
      const custRes = await queryRunner.query("SELECT id FROM users WHERE role = 'customer' LIMIT 1");
      const customerId = custRes[0]?.id;
      const svcRes = await queryRunner.query('SELECT id FROM services LIMIT 1');
      const serviceId = svcRes[0]?.id;

      for (const branch of branches) {
        // 1. Get technicians for this branch
        const techs = await queryRunner.query(
          `SELECT u.id, u.email, u.full_name
           FROM branch_staff bs
           JOIN users u ON bs.user_id = u.id
           WHERE bs.branch_id = $1 AND bs.position = 'technician' AND bs.status = 'active'`,
          [branch.id],
        );

        const branchLower = branch.code.toLowerCase().replace('-', '');
        const techNames = [
          `Tech ${branch.code} A`,
          `Tech ${branch.code} B`,
          `Tech ${branch.code} C`,
          `Tech ${branch.code} D`,
          `Tech ${branch.code} E`,
        ];

        const updatedTechs = [...techs];

        while (updatedTechs.length < 5) {
          const nextIndex = updatedTechs.length;
          const email = `tech.${branchLower}.${String.fromCharCode(97 + nextIndex)}@demo.auraspa.local`;
          const fullName = techNames[nextIndex];
          const phone = `090${branch.id}${nextIndex}12345`;

          let userId;
          const userExist = await queryRunner.query('SELECT id FROM users WHERE email = $1', [email]);
          if (userExist.length > 0) {
            userId = userExist[0].id;
          } else {
            const userRes = await queryRunner.query(
              `INSERT INTO users (email, password_hash, full_name, phone, role, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'staff', 'active', NOW(), NOW()) RETURNING id`,
              [email, passwordHash, fullName, phone],
            );
            userId = userRes[0].id;
          }

          const assignExist = await queryRunner.query('SELECT id FROM branch_staff WHERE user_id = $1 AND branch_id = $2', [userId, branch.id]);
          if (assignExist.length === 0) {
            await queryRunner.query(
              `INSERT INTO branch_staff (branch_id, user_id, position, status, staff_code, start_date, created_at, updated_at)
               VALUES ($1, $2, 'technician', 'active', $3, NOW(), NOW(), NOW())`,
              [branch.id, userId, `TECH-${branch.code}-${String.fromCharCode(65 + nextIndex)}`],
            );
          }

          updatedTechs.push({ id: userId, email, full_name: fullName });
        }

        // Get manager
        const mgrRes = await queryRunner.query(
          "SELECT user_id FROM branch_staff WHERE branch_id = $1 AND position = 'manager' AND status = 'active' LIMIT 1",
          [branch.id],
        );
        const managerId = mgrRes[0]?.user_id || '1';

        // Check if schedules already exist for these techs
        const scheduleCheck = await queryRunner.query('SELECT COUNT(*) FROM staff_schedules WHERE branch_id = $1', [branch.id]);
        const scheduleCount = parseInt(scheduleCheck[0].count, 10);

        if (scheduleCount === 0) {
          // Register shifts from July 4th to July 12th
          const t1 = updatedTechs[0].id;
          const t2 = updatedTechs[1].id;
          const t3 = updatedTechs[2].id;
          const t4 = updatedTechs[3].id;
          const t5 = updatedTechs[4].id;

          const insertShift = async (staffId: string, dateStr: string, startHour: number, endHour: number, label: string) => {
            const start = new Date(`${dateStr}T${startHour.toString().padStart(2, '0')}:00:00+07:00`);
            const end = new Date(`${dateStr}T${endHour.toString().padStart(2, '0')}:00:00+07:00`);

            const reqRes = await queryRunner.query(
              // eslint-disable-next-line max-len
              `INSERT INTO schedule_requests (staff_id, branch_id, request_type, status, requested_start, requested_end, reason, reviewed_by, reviewed_at, created_at, updated_at)
               VALUES ($1, $2, 'work_shift', 'approved', $3, $4, $5, $6, NOW(), NOW(), NOW()) RETURNING id`,
              [staffId, branch.id, start, end, label, managerId],
            );
            const reqId = reqRes[0].id;

            await queryRunner.query(
              // eslint-disable-next-line max-len
              `INSERT INTO staff_schedules (staff_id, branch_id, start_time, end_time, schedule_type, status, source_request_id, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'working', 'active', $5, $6, NOW(), NOW())`,
              [staffId, branch.id, start, end, reqId, managerId],
            );
          };

          for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
            const dayNum = (4 + dayOffset).toString().padStart(2, '0');
            const dateStr = `2026-07-${dayNum}`;

            await insertShift(t1, dateStr, 8, 12, 'Ca sáng T1');
            await insertShift(t1, dateStr, 13, 20, 'Ca chiều T1');
            await insertShift(t2, dateStr, 13, 20, 'Ca chiều T2');
            await insertShift(t3, dateStr, 8, 20, 'Ca gộp T3');
            await insertShift(t4, dateStr, 8, 20, 'Ca gộp T4');
            await insertShift(t5, dateStr, 13, 20, 'Ca chiều T5');
          }
        }

        // Seed reviews for new techs
        if (customerId && serviceId) {
          for (const tech of updatedTechs) {
            const reviewCheck = await queryRunner.query('SELECT COUNT(*) FROM reviews WHERE technician_id = $1', [tech.id]);
            const reviewCount = parseInt(reviewCheck[0].count, 10);

            if (reviewCount === 0) {
              const seedRatings = [
                [5, 4, 5],
                [4, 5, 4],
                [5, 5, 5],
                [4, 4, 5],
                [5, 5, 4],
              ][parseInt(tech.id, 10) % 5];

              for (let i = 0; i < seedRatings.length; i++) {
                const rating = seedRatings[i];

                const bookingRes = await queryRunner.query(
                  /* eslint-disable max-len */
                  `INSERT INTO bookings (customer_id, branch_id, technician_id, start_time, end_time, status, source, subtotal_amount, discount_amount, deposit_required_amount, paid_amount, remaining_amount, created_at, updated_at)
                   VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', 'completed', 'online', 100000, 0, 0, 100000, 0, NOW(), NOW())RETURNING id`,
                  /* eslint-enable max-len */
                  [customerId, branch.id, tech.id],
                );
                const bookingId = bookingRes[0].id;

                const comment = [
                  'Dịch vụ rất tốt, nhân viên thân thiện chu đáo!',
                  'Kỹ thuật viên tay nghề cao, làm rất êm ái.',
                  'Rất hài lòng với chất lượng phục vụ tại đây.',
                  'Nhân viên làm nhiệt tình, chu đáo sạch sẽ.',
                  'Tuyệt vời, sẽ quay lại lần sau!',
                ][(parseInt(tech.id, 10) + i) % 5];

                await queryRunner.query(
                  // eslint-disable-next-line max-len
                  `INSERT INTO reviews (customer_id, booking_id, branch_id, service_id, technician_id, rating, comment, status, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', NOW(), NOW())`,
                  [customerId, bookingId, branch.id, serviceId, tech.id, rating, comment],
                );
              }
            }
          }
        }
      }

      this.logger.log('✓ Successfully seeded dynamic rosters and reviews for all branches!');
    } catch (err) {
      this.logger.error('Error seeding dynamic rosters and reviews:', err);
    } finally {
      await queryRunner.release();
    }
  }
}
