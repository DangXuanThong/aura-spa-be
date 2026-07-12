import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { HealthRecord } from 'src/modules/health/entities/health-record.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { Strategy, StrategyPriority, StrategySource, StrategyStatus } from 'src/modules/strategy/entities/strategy.entity';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { BookingSource } from 'src/modules/booking/enums/booking-source.enum';
import { ServiceStatus } from 'src/modules/service/enums/service-status.enum';

export const AI_DEMO_CUSTOMERS = [
  {
    email: 'ai.customer.new@demo.auraspa.local',
    fullName: 'AI Customer New',
    phone: '0918000101',
    kind: 'new' as const,
  },
  {
    email: 'ai.customer.rich@demo.auraspa.local',
    fullName: 'AI Customer Rich',
    phone: '0918000102',
    kind: 'rich' as const,
  },
  {
    email: 'ai.customer.empty@demo.auraspa.local',
    fullName: 'AI Customer Empty',
    phone: '0918000103',
    kind: 'empty' as const,
  },
  {
    email: 'ai.customer.contra@demo.auraspa.local',
    fullName: 'AI Customer Contra',
    phone: '0918000104',
    kind: 'contra' as const,
  },
];

@Injectable()
export class DemoAiPersonasSeeder {
  private readonly logger = new Logger(DemoAiPersonasSeeder.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    @InjectRepository(HealthRecord) private readonly healthRepo: Repository<HealthRecord>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity)
    private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(Strategy) private readonly strategyRepo: Repository<Strategy>,
  ) {}

  async seed(): Promise<void> {
    const passwordHash = await bcrypt.hash('Customer123!', 12);
    const owner =
      (await this.userRepo.findOne({ where: { email: 'owner@demo.auraspa.local' } })) ||
      (await this.userRepo.findOne({ where: { role: UserRole.Owner } }));

    const users = new Map<string, User>();
    for (const c of AI_DEMO_CUSTOMERS) {
      let user = await this.userRepo.findOne({ where: { email: c.email } });
      if (!user) {
        user = await this.userRepo.save(
          this.userRepo.create({
            email: c.email,
            fullName: c.fullName,
            phone: c.phone,
            passwordHash,
            role: UserRole.Customer,
            status: UserStatus.Active,
            authProvider: AuthProvider.Email,
            gender: Gender.Unknown,
            avatarUrl: null,
            dateOfBirth: null,
            address: null,
          }),
        );
        this.logger.log(`AI demo customer created: ${c.email}`);
      }
      users.set(c.kind, user);
    }

    const branch = (await this.branchRepo.findOne({ where: { code: 'HCM-Q1' } })) || (await this.branchRepo.findOne({ where: {} }));
    const services = await this.serviceRepo.find({ where: { status: ServiceStatus.Active }, take: 20 });
    const facial = services.find((s) => /facial|skincare/i.test(s.category ?? '') || /da|facial/i.test(s.name));
    const body = services.find((s) => /massage|body/i.test(s.category ?? ''));
    const anyService = services[0];

    if (owner && branch) {
      await this.seedHealth(users, branch, owner.id);
    }
    if (branch && (facial || anyService)) {
      await this.seedRichHistory(users.get('rich')!, branch, [facial, body, anyService].filter(Boolean) as Service[]);
    }
    if (owner) {
      await this.seedStrategies(owner.id);
    }

    this.logger.log('AI demo seed completed');
  }

  private async seedHealth(users: Map<string, User>, branch: Branch, createdBy: string): Promise<void> {
    const defs: Array<{ kind: string; skinType: string | null; contraindications: string | null; notes: string | null }> = [
      { kind: 'rich', skinType: 'oily', contraindications: null, notes: 'Ưa facial cấp ẩm' },
      { kind: 'contra', skinType: 'sensitive', contraindications: 'Không massage sâu', notes: 'Tránh trị liệu body mạnh' },
      { kind: 'empty', skinType: null, contraindications: null, notes: null },
      { kind: 'new', skinType: 'combination', contraindications: null, notes: null },
    ];

    for (const d of defs) {
      const user = users.get(d.kind);
      if (!user) continue;
      const existing = await this.healthRepo.findOne({ where: { customerId: user.id, branchId: branch.id } });
      if (existing) continue;
      await this.healthRepo.save(
        this.healthRepo.create({
          customerId: user.id,
          branchId: branch.id,
          skinType: d.skinType,
          allergies: null,
          medicalConditions: null,
          pregnancyStatus: null,
          contraindications: d.contraindications,
          notes: d.notes,
          createdBy,
          updatedBy: null,
        }),
      );
    }
  }

  private async seedRichHistory(user: User, branch: Branch, services: Service[]): Promise<void> {
    const count = await this.bookingRepo.count({ where: { customerId: user.id } });
    if (count >= 3) return;

    for (let i = 0; i < Math.min(3, services.length); i++) {
      const svc = services[i];
      const start = new Date();
      start.setDate(start.getDate() - (14 + i * 10));
      start.setHours(10 + i, 0, 0, 0);
      const end = new Date(start.getTime() + svc.defaultDurationMinutes * 60_000);
      const price = Number(svc.defaultPrice);

      const booking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: user.id,
          branchId: branch.id,
          technicianId: null,
          startTime: start,
          endTime: end,
          status: BookingStatus.Completed,
          source: BookingSource.Online,
          subtotalAmount: price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: price,
          remainingAmount: 0,
          notes: 'AI demo history',
          completedAt: end,
        }),
      );

      await this.bookingServiceRepo.save(
        this.bookingServiceRepo.create({
          bookingId: booking.id,
          serviceId: svc.id,
          quantity: 1,
          durationMinutes: svc.defaultDurationMinutes,
          unitPrice: price,
          discountAmount: 0,
          finalAmount: price,
        }),
      );
    }
  }

  private async seedStrategies(ownerId: string): Promise<void> {
    const existing = await this.strategyRepo.count({ where: { source: StrategySource.AiGenerated } });
    if (existing >= 2) return;

    await this.strategyRepo.save([
      this.strategyRepo.create({
        title: '[Seed] Chiến lược AI độ tin cậy thấp',
        description: 'Mẫu UI low-confidence — dùng để test banner cảnh báo trước khi Owner duyệt.',
        badge: 'AI Demo',
        priority: StrategyPriority.Low,
        status: StrategyStatus.Proposed,
        source: StrategySource.AiGenerated,
        aiConfidence: 0.42,
        supportingData: { highlights: ['Dữ liệu mỏng (seed)', 'Chỉ mang tính minh họa UI'] },
        createdBy: ownerId,
        updatedBy: ownerId,
      }),
      this.strategyRepo.create({
        title: '[Seed] Tối ưu slot chi nhánh dẫn đầu',
        description: 'Mẫu UI high-confidence — mở rộng khung giờ cao điểm dựa trên snapshot seed.',
        badge: 'Vận hành',
        priority: StrategyPriority.High,
        status: StrategyStatus.Proposed,
        source: StrategySource.AiGenerated,
        aiConfidence: 0.85,
        supportingData: {
          highlights: ['Doanh thu demo ổn định', 'Top service Facial/Massage', 'Cancel rate theo dõi được'],
        },
        createdBy: ownerId,
        updatedBy: ownerId,
      }),
    ]);
  }

  async verifyMatrix(): Promise<Record<string, unknown>> {
    const emails = AI_DEMO_CUSTOMERS.map((c) => c.email);
    const users = await this.userRepo.find({ where: { email: In(emails) } });
    const byEmail = new Map(users.map((u) => [u.email!, u]));
    const rich = byEmail.get('ai.customer.rich@demo.auraspa.local');
    const contra = byEmail.get('ai.customer.contra@demo.auraspa.local');
    const empty = byEmail.get('ai.customer.empty@demo.auraspa.local');

    const richBookings = rich ? await this.bookingRepo.count({ where: { customerId: rich.id } }) : 0;
    const emptyBookings = empty ? await this.bookingRepo.count({ where: { customerId: empty.id } }) : 0;
    const contraHealth = contra ? await this.healthRepo.findOne({ where: { customerId: contra.id } }) : null;
    const aiStrategies = await this.strategyRepo.count({ where: { source: StrategySource.AiGenerated } });
    const activeServices = await this.serviceRepo.count({ where: { status: ServiceStatus.Active } });

    return {
      personas: {
        rich: Boolean(rich) && richBookings >= 3,
        empty: Boolean(empty) && emptyBookings === 0,
        contra: Boolean(contra) && Boolean(contraHealth?.contraindications),
        new: Boolean(byEmail.get('ai.customer.new@demo.auraspa.local')),
      },
      richBookings,
      emptyBookings,
      contraHasFlag: Boolean(contraHealth?.contraindications),
      aiStrategies,
      activeServices,
      ok:
        Boolean(rich) &&
        richBookings >= 3 &&
        Boolean(empty) &&
        emptyBookings === 0 &&
        Boolean(contraHealth?.contraindications) &&
        aiStrategies >= 2 &&
        activeServices >= 3,
    };
  }
}
