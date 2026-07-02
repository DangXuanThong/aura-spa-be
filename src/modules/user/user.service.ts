import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
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
      relations: { branch: true },
    });

    if (!assignment) return { branchId: null, branchCode: null };

    return {
      branchId: assignment.branchId,
      branchCode: assignment.branch?.code ?? null,
    };
  }

  async findByEmail(email: string, options?: FindUserByEmailOptions): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    let user: User | null;

    if (options?.includePasswordHash) {
      user = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash') // Auth cần password hash để compare khi login.
        .where('user.email = :email', { email: normalizedEmail })
        .getOne();
    } else {
      user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    }

    if (user && (user.role === 'staff' || user.role === 'manager')) {
      const branchInfo = await this.getBranchInfo(user.id);
      user.branchId = branchInfo.branchId;
      user.branchCode = branchInfo.branchCode;
    }
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (user && (user.role === 'staff' || user.role === 'manager')) {
      const branchInfo = await this.getBranchInfo(user.id);
      user.branchId = branchInfo.branchId;
      user.branchCode = branchInfo.branchCode;
    }
    return user;
  }

  async create(data: CreateUserData, manager?: EntityManager): Promise<User> {
    const repo = manager ? manager.getRepository(User) : this.userRepository;
    const user = repo.create(data);
    return repo.save(user);
  }

  async update(id: string, data: Partial<User>, manager?: EntityManager): Promise<User> {
    if (!manager) {
      await this.userRepository.update(id, data);
      // findById will never return null here since we just updated a known user
      return (await this.findById(id)) as User;
    }
    const repo = manager.getRepository(User);
    await repo.update(id, data);
    // repo.findOne will never return null here since we just updated a known user
    return (await repo.findOne({ where: { id } })) as User;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }
}
