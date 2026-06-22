import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

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
  ) {}

  async findByEmail(email: string, options?: FindUserByEmailOptions): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (options?.includePasswordHash) {
      return this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash') // Auth cần password hash để compare khi login.
        .where('user.email = :email', { email: normalizedEmail })
        .getOne();
    }

    return this.userRepository.findOne({ where: { email: normalizedEmail } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.userRepository.update(id, data);
    // findById will never return null here since we just updated a known user
    return (await this.findById(id)) as User;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }
}
