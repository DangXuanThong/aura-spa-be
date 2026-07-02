import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { TreatmentCourse } from './entities/treatment-course.entity';
import { TreatmentSession } from './entities/treatment-session.entity';
import { HealthRecord } from 'src/modules/health/entities/health-record.entity';
import { TreatmentCourseStatus } from './enums/treatment-course-status.enum';

@Injectable()
export class TreatmentService {
  private readonly logger = new Logger(TreatmentService.name);

  constructor(
    @InjectRepository(TreatmentCourse)
    private readonly courseRepo: Repository<TreatmentCourse>,
    @InjectRepository(TreatmentSession)
    private readonly sessionRepo: Repository<TreatmentSession>,
    @InjectRepository(HealthRecord)
    private readonly healthRepo: Repository<HealthRecord>,
  ) {}

  // Run daily at 00:05 server time — auto-expire courses whose expiresAt has passed
  @Cron('5 0 * * *')
  async expireOverdueCourses(): Promise<void> {
    const result = await this.courseRepo.update(
      { status: TreatmentCourseStatus.Active, expiresAt: LessThan(new Date()) },
      { status: TreatmentCourseStatus.Expired },
    );
    if (result.affected) {
      this.logger.log(`Auto-expired ${result.affected} treatment course(s)`);
    }
  }

  // BUG-094 — Staff/Manager view: treatment courses for a specific customer
  async findCoursesByCustomer(customerId: string): Promise<(TreatmentCourse & { sessions: TreatmentSession[] })[]> {
    const courses = await this.courseRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return this.attachSessions(courses);
  }

  // UC16 — Track Treatment Progress (customer calls this for their own courses)
  findMyCourses(customerId: string): Promise<(TreatmentCourse & { sessions: TreatmentSession[] })[]> {
    return this.findCoursesByCustomer(customerId);
  }

  async findOneCourse(id: string, customerId: string): Promise<TreatmentCourse & { sessions: TreatmentSession[] }> {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException(`Treatment course ${id} not found`);
    if (course.customerId !== customerId) throw new ForbiddenException('You do not have access to this treatment course');

    const [withSessions] = await this.attachSessions([course]);
    return withSessions;
  }

  // BUG-131 — Surface health contraindications before treatment delivery
  async getCustomerHealthFlags(customerId: string): Promise<HealthRecord[]> {
    return this.healthRepo
      .createQueryBuilder('hr')
      .where('hr.customerId = :customerId', { customerId })
      .andWhere(
        '(hr.contraindications IS NOT NULL OR hr.allergies IS NOT NULL OR hr.pregnancyStatus IS NOT NULL OR hr.medicalConditions IS NOT NULL)',
      )
      .orderBy('hr.createdAt', 'DESC')
      .take(10)
      .getMany();
  }

  private async attachSessions(courses: TreatmentCourse[]): Promise<(TreatmentCourse & { sessions: TreatmentSession[] })[]> {
    if (courses.length === 0) return [];
    const ids = courses.map((c) => c.id);
    const allSessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.treatmentCourseId IN (:...ids)', { ids })
      .orderBy('s.sessionNumber', 'ASC')
      .getMany();

    const sessionsByCourse = new Map<string, TreatmentSession[]>();
    for (const session of allSessions) {
      const list = sessionsByCourse.get(session.treatmentCourseId) ?? [];
      list.push(session);
      sessionsByCourse.set(session.treatmentCourseId, list);
    }

    return courses.map((c) => Object.assign(c, { sessions: sessionsByCourse.get(c.id) ?? [] }));
  }
}
