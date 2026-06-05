import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

export interface FindUserByEmailOptions {
  includePasswordHash: boolean;
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
}
