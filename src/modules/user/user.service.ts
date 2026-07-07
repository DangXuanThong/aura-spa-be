import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';

export interface FindUserByEmailOptions {
  includePasswordHash: boolean;
}

export interface CreateUserData {
  fullName: string;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  authProvider: User['authProvider'];
  status: User['status'];
  gender: User['gender'];
  dateOfBirth: Date | null;
  address: string | null;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepository: Repository<BranchStaff>,
  ) {}

  async getBranchInfo(userId: string): Promise<{ branchId: string | null; branchCode: string | null }> {
    const assignment = await this.branchStaffRepository.findOne({
      where: { userId, status: StaffStatus.Active },
      relations: ['branch'],
    });
    if (assignment) {
      return { branchId: assignment.branchId, branchCode: assignment.branch?.code ?? null };
    }
    return { branchId: null, branchCode: null };
  }

  async findByEmail(email: string, options?: FindUserByEmailOptions): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    let user: User | null = null;

    if (options?.includePasswordHash) {
      user = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash') // Auth cần password hash để compare khi login.
        .where('user.email = :email', { email: normalizedEmail })
        .getOne();
    } else {
      user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    }

    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
    // branchId/branchCode are set by JwtStrategy.validate() from the JWT payload — not fetched on every request
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    // Strip fields that must never change via this method to prevent privilege escalation
    const { role: _r, id: _i, ...safe } = data as Record<string, unknown>;
    await this.userRepository.update(id, safe as Partial<User>);
    // findById will never return null here since we just updated a known user
    return (await this.findById(id)) as User;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }
}

