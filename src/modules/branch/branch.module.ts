import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchController } from './branch.controller';
import { Branch } from './entities/branch.entity';
import { BranchService } from './branch.service';
<<<<<<< Updated upstream

@Module({
  imports: [TypeOrmModule.forFeature([Branch])],
  controllers: [BranchController],
  providers: [BranchService],
=======
import { BranchOpeningHoursService } from './branch-opening-hours.service';
import { BranchStaffService } from './branch-staff.service';
import { SlotConfigService } from './slot-config.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BranchServiceModule } from 'src/modules/branch-service/branch-service.module';
import { MailModule } from 'src/modules/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, BranchOpeningHours, BranchStaff, User, BookingSlotConfig]),
    AuthModule, // ← provides JwtStrategy + PassportModule for JwtAuthGuard
    BranchServiceModule,
    MailModule,
  ],
  controllers: [BranchController, BranchStaffController],
  providers: [BranchService, BranchOpeningHoursService, BranchStaffService, SlotConfigService, RolesGuard],
>>>>>>> Stashed changes
  exports: [BranchService],
})
export class BranchModule {}
