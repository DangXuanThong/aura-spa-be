import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TreatmentCourse } from 'src/modules/treatment/entities/treatment-course.entity';
import { TreatmentSession } from 'src/modules/treatment/entities/treatment-session.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { TREATMENT_COURSE_DEFS } from './seed-data';

@Injectable()
export class TreatmentSeeder {
  private readonly logger = new Logger(TreatmentSeeder.name);

  constructor(
    @InjectRepository(TreatmentCourse)
    private readonly courseRepo: Repository<TreatmentCourse>,
    @InjectRepository(TreatmentSession)
    private readonly sessionRepo: Repository<TreatmentSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.courseRepo.count();
    if (count > 0) {
      this.logger.log('Treatment courses already exist — skipping');
      return;
    }

    const allEmails = [
      ...new Set([
        ...TREATMENT_COURSE_DEFS.map((d) => d.customerEmail),
        ...TREATMENT_COURSE_DEFS.flatMap((d) => d.sessions.map((s) => s.technicianEmail).filter((e): e is string => e !== null)),
      ]),
    ];
    const users = await this.userRepo.find({ where: { email: In(allEmails) } });
    const userMap = new Map(users.map((u) => [u.email, u]));

    const branchCodes = [...new Set(TREATMENT_COURSE_DEFS.map((d) => d.branchCode))];
    const branches = await this.branchRepo.find({ where: { code: In(branchCodes) } });
    const branchMap = new Map(branches.map((b) => [b.code, b]));

    const serviceCodes = [...new Set(TREATMENT_COURSE_DEFS.map((d) => d.serviceCode))];
    const services = await this.serviceRepo.find({ where: { code: In(serviceCodes) } });
    const serviceMap = new Map(services.map((s) => [s.code, s]));

    let seeded = 0;
    for (const def of TREATMENT_COURSE_DEFS) {
      const customer = userMap.get(def.customerEmail);
      const branch = branchMap.get(def.branchCode);
      const service = serviceMap.get(def.serviceCode);
      if (!customer || !branch || !service) continue;

      const course = await this.courseRepo.save(
        this.courseRepo.create({
          customerId: customer.id,
          serviceId: service.id,
          branchId: branch.id,
          purchaseInvoiceId: null,
          totalSessions: def.totalSessions,
          usedSessions: def.usedSessions,
          remainingSessions: def.remainingSessions,
          status: def.status,
          startedAt: def.startedAt,
          expiresAt: def.expiresAt,
        }),
      );

      for (const s of def.sessions) {
        const technician = s.technicianEmail ? userMap.get(s.technicianEmail) : null;
        await this.sessionRepo.save(
          this.sessionRepo.create({
            treatmentCourseId: course.id,
            bookingId: null,
            serviceId: service.id,
            sessionNumber: s.sessionNumber,
            status: s.status,
            staffId: technician?.id ?? null,
            progressNote: s.progressNote,
            beforeImages: null,
            afterImages: null,
            completedAt: s.completedAt,
          }),
        );
      }

      seeded++;
    }

    this.logger.log(`Seeded ${seeded} treatment course(s)`);
  }
}
