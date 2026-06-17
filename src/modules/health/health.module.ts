import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthRecord } from './entities/health-record.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([HealthRecord, BranchStaff]), AuthModule],
  controllers: [HealthController],
  providers: [HealthService, RolesGuard],
  exports: [HealthService],
})
export class HealthModule {}
