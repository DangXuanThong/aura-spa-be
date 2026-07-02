import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, BranchStaff])],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
