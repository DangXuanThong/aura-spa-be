import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchController } from './branch.controller';
import { BranchStaffController } from './branch-staff.controller';
import { Branch } from './entities/branch.entity';
import { BranchOpeningHours } from './entities/branch-opening-hours.entity';
import { BranchStaff } from './entities/branch-staff.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { BranchService } from './branch.service';
import { BranchOpeningHoursService } from './branch-opening-hours.service';
import { BranchStaffService } from './branch-staff.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BranchServiceModule } from 'src/modules/branch-service/branch-service.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, BranchOpeningHours, BranchStaff, User]),
    AuthModule, // ← provides JwtStrategy + PassportModule for JwtAuthGuard
    BranchServiceModule,
  ],
  controllers: [BranchController, BranchStaffController],
  providers: [BranchService, BranchOpeningHoursService, BranchStaffService, RolesGuard],
  exports: [BranchService],
})
export class BranchModule {}
