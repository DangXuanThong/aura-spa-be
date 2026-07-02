import * as bcrypt from 'bcryptjs';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In } from 'typeorm';
import { BranchStaff } from './entities/branch-staff.entity';
import { Branch } from './entities/branch.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { StaffStatus } from './enums/staff-status.enum';
import { StaffPosition } from './enums/staff-position.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { TransferManagerDto } from './dto/transfer-manager.dto';
import { MailService } from 'src/modules/mail/mail.service';

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
    private readonly mailService: MailService,
  ) {}

  // UC25 — List staff at branch
  async list(branchId: string, managerId: string, role?: string): Promise<BranchStaff[]> {
    if (role !== UserRole.Owner) {
      await this.assertManagerAtBranch(managerId, branchId);
    }

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
    const rawPassword = this.configService.getOrThrow<string>('DEFAULT_STAFF_PASSWORD');
    const passwordHash = await bcrypt.hash(rawPassword, 12);
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
    void this.mailService.sendWelcomeEmail(normalizedEmail, dto.fullName, rawPassword);
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

    // Reassign upcoming/active bookings of this staff to null (Chưa phân công KTV)
    const { Booking } = await import('src/modules/booking/entities/booking.entity');
    const { BookingStatus } = await import('src/modules/booking/enums/booking-status.enum');
    await this.branchStaffRepo.manager.update(
      Booking,
      {
        technicianId: userId,
        status: In([
          BookingStatus.PendingPayment,
          BookingStatus.Confirmed,
          BookingStatus.CheckedIn,
          BookingStatus.InService,
        ]),
      },
      { technicianId: null }
    );

    return this.loadAssignment(branchId, userId);
  }

  // UC33 — Owner: list manager accounts at branch
  async listManagers(branchId: string): Promise<BranchStaff[]> {
    return this.branchStaffRepo.find({
      where: { branchId, position: StaffPosition.Manager },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  // UC33 — Owner: create manager account and assign to branch
  async createManager(branchId: string, dto: CreateManagerDto): Promise<BranchStaff> {
    const branch = await this.branchRepo.findOne({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const count = await this.branchStaffRepo.count({ where: { branchId, position: StaffPosition.Manager } });
    const staffCode = `MGR-${branch.code}-${String(count + 1).padStart(3, '0')}`;
    const rawPassword = this.configService.getOrThrow<string>('DEFAULT_STAFF_PASSWORD');
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    const user = await this.userRepo.save(
      this.userRepo.create({
        fullName: dto.fullName,
        email: normalizedEmail,
        phone: dto.phone ?? null,
        passwordHash,
        role: UserRole.Manager,
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
        position: StaffPosition.Manager,
        status: StaffStatus.Active,
        startDate,
        endDate: null,
      }),
    );

    assignment.user = user;
    void this.mailService.sendWelcomeEmail(normalizedEmail, dto.fullName, rawPassword);
    return assignment;
  }

  // UC33 — Owner: edit manager account
  async updateManager(branchId: string, userId: string, dto: UpdateStaffDto): Promise<BranchStaff> {
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

    return this.loadAssignment(branchId, userId);
  }

  // UC33 — Owner: deactivate manager account
  async deactivateManager(branchId: string, userId: string): Promise<BranchStaff> {
    const assignment = await this.loadAssignment(branchId, userId);
    if (assignment.status === StaffStatus.Inactive) {
      throw new BadRequestException('Manager account is already inactive');
    }

    await this.branchStaffRepo.update(assignment.id, { status: StaffStatus.Inactive, endDate: new Date() });
    await this.userRepo.update(userId, { status: UserStatus.Suspended, email: null });

    return this.loadAssignment(branchId, userId);
  }

  // UC33 — Owner: transfer manager to another branch (atomic)
  async transferManager(sourceBranchId: string, userId: string, dto: TransferManagerDto): Promise<BranchStaff> {
    if (dto.targetBranchId === sourceBranchId) {
      throw new BadRequestException('Target branch must differ from the current branch');
    }

    const targetBranch = await this.branchRepo.findOne({ where: { id: dto.targetBranchId } });
    if (!targetBranch) throw new NotFoundException('Target branch not found');

    const sourceAssignment = await this.branchStaffRepo.findOne({
      where: { branchId: sourceBranchId, userId, position: StaffPosition.Manager },
      relations: ['user'],
    });
    if (!sourceAssignment) throw new NotFoundException('Manager not found at source branch');
    if (sourceAssignment.status === StaffStatus.Inactive) {
      throw new BadRequestException('Manager account is already inactive');
    }

    const alreadyAtTarget = await this.branchStaffRepo.findOne({
      where: { branchId: dto.targetBranchId, userId },
    });
    if (alreadyAtTarget) throw new ConflictException('Manager already has an assignment at the target branch');

    const activeManagerAtTarget = await this.branchStaffRepo.findOne({
      where: { branchId: dto.targetBranchId, position: StaffPosition.Manager, status: StaffStatus.Active },
      relations: ['user'],
    });
    if (activeManagerAtTarget) {
      throw new ConflictException(
        `Chi nhánh đích đã có manager đang hoạt động (${activeManagerAtTarget.user?.fullName ?? activeManagerAtTarget.userId}). Vô hiệu hóa họ trước rồi mới chuyển.`,
      );
    }

    const count = await this.branchStaffRepo.count({
      where: { branchId: dto.targetBranchId, position: StaffPosition.Manager },
    });
    const newStaffCode = `MGR-${targetBranch.code}-${String(count + 1).padStart(3, '0')}`;
    const today = new Date();

    let saved: BranchStaff | undefined;
    await this.branchStaffRepo.manager.transaction(async (em) => {
      await em.update(BranchStaff, sourceAssignment.id, {
        status: StaffStatus.Inactive,
        endDate: today,
      });
      const newAssignment = em.create(BranchStaff, {
        branchId: dto.targetBranchId,
        userId,
        staffCode: newStaffCode,
        position: StaffPosition.Manager,
        status: StaffStatus.Active,
        startDate: today,
        endDate: null,
      });
      saved = await em.save(BranchStaff, newAssignment);
    });

    saved!.user = sourceAssignment.user;
    return saved!;
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
