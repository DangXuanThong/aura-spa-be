import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Review, Branch, BranchStaff]), AuthModule],
  controllers: [ReportController],
  providers: [ReportService, RolesGuard],
})
export class ReportModule {}
