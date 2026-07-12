import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { TreatmentCourse } from './entities/treatment-course.entity';
import { TreatmentSession } from './entities/treatment-session.entity';
import { UpdateTreatmentSessionProgressDto } from './dto/update-treatment-session-progress.dto';

@Injectable()
export class TreatmentService {
  constructor(
    @InjectRepository(TreatmentCourse)
    private readonly courseRepo: Repository<TreatmentCourse>,
    @InjectRepository(TreatmentSession)
    private readonly sessionRepo: Repository<TreatmentSession>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
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

  async findBranchCourses(
    branchId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<(TreatmentCourse & { sessions: TreatmentSession[] })[]> {
    if (requesterRole !== UserRole.Owner) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, branchId, status: StaffStatus.Active },
      });
      if (!assignment) throw new ForbiddenException('You are not active at this branch');
    }

    const courses = await this.courseRepo.find({
      where: { branchId },
      relations: ['customer', 'service', 'branch'],
      order: { updatedAt: 'DESC' },
    });

    return this.attachSessions(courses);
  }

  async updateSessionProgress(
    sessionId: string,
    dto: UpdateTreatmentSessionProgressDto,
    requesterId: string,
    requesterRole: string,
  ): Promise<TreatmentSession> {
    if (
      dto.progressNote === undefined &&
      dto.beforeImages === undefined &&
      dto.afterImages === undefined &&
      dto.careRecommendation === undefined &&
      dto.nextRecommendedAt === undefined
    ) {
      throw new BadRequestException('At least one progress field is required');
    }

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['treatmentCourse'],
    });
    if (!session || !session.treatmentCourse) {
      throw new NotFoundException(`Treatment session ${sessionId} not found`);
    }

    if (requesterRole !== UserRole.Owner) {
      const branchId = session.treatmentCourse.branchId;
      if (!branchId) {
        throw new ForbiddenException('This treatment course is not assigned to a branch');
      }

      const assignment = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, branchId, status: StaffStatus.Active },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not active at this treatment branch');
      }
    }

    if (dto.progressNote !== undefined) {
      const note = dto.progressNote.trim();
      session.progressNote = note.length > 0 ? note : null;
    }
    if (dto.beforeImages !== undefined) {
      session.beforeImages = this.normalizeImageUrls(dto.beforeImages);
    }
    if (dto.afterImages !== undefined) {
      session.afterImages = this.normalizeImageUrls(dto.afterImages);
    }
    if (dto.careRecommendation !== undefined) {
      const recommendation = dto.careRecommendation.trim();
      session.careRecommendation = recommendation.length > 0 ? recommendation : null;
    }
    if (dto.nextRecommendedAt !== undefined) {
      session.nextRecommendedAt = this.parseOptionalDate(dto.nextRecommendedAt, 'nextRecommendedAt');
    }

    return this.sessionRepo.save(session);
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

  private normalizeImageUrls(urls: string[]): string[] | null {
    const normalized = urls.map((url) => url.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized : null;
  }

  private parseOptionalDate(value: string | undefined, fieldName: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }
    return date;
  }
}
