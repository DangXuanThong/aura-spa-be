import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { BranchStatus } from 'src/modules/branch/enums/branch-status.enum';
import { ServiceStatus } from 'src/modules/service/enums/service-status.enum';
import { ConfigService } from '@nestjs/config';

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
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get('NODE_ENV') === 'production') return;
    await this.seedOwnerAccount();
    await this.seedCustomers();
    await this.seedStaff();
    await this.seedBranches();
    await this.seedServices();
  }

  // ── Owner ────────────────────────────────────────────────────────────────

  private async seedOwnerAccount(): Promise<void> {
    const email = 'owner@gmail.com';
    const password = '12345678qwerty';
    const fullName = 'System Owner';

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      this.logger.log(`Owner already exists — skipping (${email})`);
      return;
    }

    await this.userRepository.save(
      this.userRepository.create({
        email,
        fullName,
        passwordHash: await bcrypt.hash(password, 12),
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

    this.logger.log(`Owner seeded (${email})`);
  }

  // ── Customers ────────────────────────────────────────────────────────────

  private async seedCustomers(): Promise<void> {
    const CUSTOMERS = [
      { fullName: 'Nguyen Thi Lan', email: 'lan.nguyen@gmail.com', phone: '0901111001', gender: Gender.Female },
      { fullName: 'Tran Van Minh', email: 'minh.tran@gmail.com', phone: '0901111002', gender: Gender.Male },
      { fullName: 'Le Thi Hoa', email: 'hoa.le@gmail.com', phone: '0901111003', gender: Gender.Female },
      { fullName: 'Pham Quoc Bao', email: 'bao.pham@gmail.com', phone: '0901111004', gender: Gender.Male },
      { fullName: 'Hoang Thi Mai', email: 'mai.hoang@gmail.com', phone: '0901111005', gender: Gender.Female },
    ];

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
    const STAFF = [
      { fullName: 'Vo Thi Thu', email: 'thu.vo@aura-spa.com', phone: '0902222001', gender: Gender.Female },
      { fullName: 'Nguyen Van Duc', email: 'duc.nguyen@aura-spa.com', phone: '0902222002', gender: Gender.Male },
      { fullName: 'Tran Thi Bich', email: 'bich.tran@aura-spa.com', phone: '0902222003', gender: Gender.Female },
    ];

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

  // ── Branches ─────────────────────────────────────────────────────────────

  private async seedBranches(): Promise<void> {
    const BRANCHES = [
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
    const SERVICES = [
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

    let seeded = 0;

    for (const s of SERVICES) {
      const exists = await this.serviceRepository.findOne({ where: { code: s.code } });
      if (exists) continue;

      await this.serviceRepository.save(this.serviceRepository.create(s));
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} service(s)`);
    else this.logger.log('Services already exist — skipping');
  }
}
