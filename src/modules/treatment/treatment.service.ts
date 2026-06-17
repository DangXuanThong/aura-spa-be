import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreatmentCourse } from './entities/treatment-course.entity';
import { TreatmentSession } from './entities/treatment-session.entity';

@Injectable()
export class TreatmentService {
  constructor(
    @InjectRepository(TreatmentCourse)
    private readonly courseRepo: Repository<TreatmentCourse>,
    @InjectRepository(TreatmentSession)
    private readonly sessionRepo: Repository<TreatmentSession>,
  ) {}

  // UC16 — Track Treatment Progress
  async findMyCourses(customerId: string): Promise<(TreatmentCourse & { sessions: TreatmentSession[] })[]> {
    const courses = await this.courseRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
    return this.attachSessions(courses);
  }

  async findOneCourse(id: string, customerId: string): Promise<TreatmentCourse & { sessions: TreatmentSession[] }> {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException(`Treatment course ${id} not found`);
    if (course.customerId !== customerId) throw new ForbiddenException('You do not have access to this treatment course');

    const [withSessions] = await this.attachSessions([course]);
    return withSessions;
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
