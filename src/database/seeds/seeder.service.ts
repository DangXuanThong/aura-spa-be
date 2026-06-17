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
import { ConfigService } from '@nestjs/config';
import { BranchSetupSeeder } from './branch-setup.seeder';
import { BookingSeeder } from './booking.seeder';
import { PaymentSeeder } from './payment.seeder';
import { ReviewSeeder } from './review.seeder';
import { HealthSeeder } from './health.seeder';
import { InventorySeeder } from './inventory.seeder';
import { PromotionSeeder } from './promotion.seeder';
import { DiscountCodeSeeder } from './discount-code.seeder';
import { ConversationSeeder } from './conversation.seeder';
import { OWNER, CUSTOMERS, STAFF, BRANCHES, SERVICES } from './seed-data';

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
    private readonly conversationSeeder: ConversationSeeder,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get('NODE_ENV') === 'production') return;
    await this.seedOwnerAccount();
    await this.seedCustomers();
    await this.seedStaff();
    await this.seedBranches();
    await this.seedServices();
    await this.branchSetupSeeder.seed();
    await this.bookingSeeder.seed();
    await this.paymentSeeder.seed();
    await this.reviewSeeder.seed();
    await this.healthSeeder.seed();
    await this.inventorySeeder.seed();
    await this.promotionSeeder.seed();
    await this.discountCodeSeeder.seed();
    await this.conversationSeeder.seed();
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
      const exists = await this.serviceRepository.findOne({ where: { code: s.code } });
      if (exists) continue;

      await this.serviceRepository.save(this.serviceRepository.create(s));
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} service(s)`);
    else this.logger.log('Services already exist — skipping');
  }
}
