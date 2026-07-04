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
const MASSAGE_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAac7WTbymLJneytGE32jl_6mZs8HB5e7peYvWSICJEjugnfoFn9hqi-Z89SyFX_FtMebEnwXwECz37pkn2Cr_fHOO9Wb3F_ZF9MQ24TsMoETpYV18oDWZxG-ccf2fx3EOv5ICbFAp6UP8d96KPWSPos5eNYJerhenxI06RtryA8-a3xcbE6KnzmpPHQNOFnk7FohSvHeuNE_fm51bo7Rm1tfie71p9cGKfhoQ23o3QoGI76AartLuTxv3vSUEtedpr8RJ-yAAtmRE';
const FACIAL_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDQREwFNHYxXIZc_Yn_u55Mx5xTO5tWoeWj1fytHY7vaVgQVak61Brh-3NckmNeClOZcbXox-os-a_P3-6z_biSz6_DmappUvGWMAl4yDvad51EeTBnVYTtb40VTGZMGuDLxKhiw2XJIbSu_QGi0pf9RncnPN1MwHKMDWBYkFELk51zkOPSh-cz1dV7GUpdLvgnvqnhI3HoaitDtjL26OblmlQaSRYoTVZH-zlJ_xHo-9XRxIVsXHPCavGYDhF1jgQGrETa1urSPkg';
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
}
