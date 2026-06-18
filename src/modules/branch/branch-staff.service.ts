import * as bcrypt from 'bcryptjs';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BranchStaff } from './entities/branch-staff.entity';
import { Branch } from './entities/branch.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { StaffStatus } from './enums/staff-status.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class BranchStaffService {
  constructor(
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  // UC25 — List staff at branch
  async list(branchId: string, managerId: string): Promise<BranchStaff[]> {
    await this.assertManagerAtBranch(managerId, branchId);

    return this.branchStaffRepo.find({
      where: { branchId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  // UC25 — Get one staff member
  async findOne(branchId: string, userId: string, managerId: string): Promise<BranchStaff> {
    await this.assertManagerAtBranch(managerId, branchId);
    return this.loadAssignment(branchId, userId);
  }

  // UC25 — Create staff account and assign to branch
  async create(branchId: string, dto: CreateStaffDto, managerId: string): Promise<BranchStaff> {
    await this.assertManagerAtBranch(managerId, branchId);

    const branch = await this.branchRepo.findOne({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const count = await this.branchStaffRepo.count({ where: { branchId } });
    const staffCode = `STF-${branch.code}-${String(count + 1).padStart(3, '0')}`;
    const passwordHash = await bcrypt.hash(this.configService.getOrThrow<string>('DEFAULT_STAFF_PASSWORD'), 12);
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    const user = await this.userRepo.save(
      this.userRepo.create({
        fullName: dto.fullName,
        email: normalizedEmail,
        phone: dto.phone ?? null,
        passwordHash,
        role: UserRole.Staff,
        status: UserStatus.Active,
        authProvider: AuthProvider.Email,
        gender: dto.gender ?? Gender.Unknown,
        dateOfBirth: null,
        address: null,
        avatarUrl: null,
      }),
    );

    const assignment = await this.branchStaffRepo.save(
      this.branchStaffRepo.create({
        branchId,
        userId: user.id,
        staffCode,
        position: dto.position,
        status: StaffStatus.Active,
        startDate,
        endDate: null,
      }),
    );

    assignment.user = user;
    return assignment;
  }

  // UC25 — Edit staff account / assignment
  async update(branchId: string, userId: string, dto: UpdateStaffDto, managerId: string): Promise<BranchStaff> {
    await this.assertManagerAtBranch(managerId, branchId);

    const assignment = await this.loadAssignment(branchId, userId);

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== assignment.user!.email) {
        const conflict = await this.userRepo.findOne({ where: { email: normalizedEmail } });
        if (conflict) throw new ConflictException('A user with this email already exists');
        await this.userRepo.update(userId, { email: normalizedEmail });
      }
    }

    const userUpdates: Partial<User> = {};
    if (dto.fullName !== undefined) userUpdates.fullName = dto.fullName;
    if (dto.phone !== undefined) userUpdates.phone = dto.phone;
    if (dto.gender !== undefined) userUpdates.gender = dto.gender;
    if (Object.keys(userUpdates).length > 0) await this.userRepo.update(userId, userUpdates);

    if (dto.position !== undefined) {
      await this.branchStaffRepo.update(assignment.id, { position: dto.position });
    }

    return this.loadAssignment(branchId, userId);
  }

  // UC25 — Deactivate staff at branch
  async deactivate(branchId: string, userId: string, managerId: string): Promise<BranchStaff> {
    await this.assertManagerAtBranch(managerId, branchId);

    if (userId === managerId) throw new BadRequestException('You cannot deactivate your own account');

    const assignment = await this.loadAssignment(branchId, userId);
    if (assignment.status === StaffStatus.Inactive) {
      throw new BadRequestException('Staff member is already inactive');
    }

    await this.branchStaffRepo.update(assignment.id, {
      status: StaffStatus.Inactive,
      endDate: new Date(),
    });

    return this.loadAssignment(branchId, userId);
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active staff member at this branch');
  }

  private async loadAssignment(branchId: string, userId: string): Promise<BranchStaff> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { branchId, userId },
      relations: ['user'],
    });
    if (!assignment) throw new NotFoundException('Staff member not found at this branch');
    return assignment;
  }
}
