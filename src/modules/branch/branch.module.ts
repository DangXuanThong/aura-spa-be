import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchController } from './branch.controller';
import { Branch } from './entities/branch.entity';
import { BranchOpeningHours } from './entities/branch-opening-hours.entity';
import { BranchService } from './branch.service';
import { BranchOpeningHoursService } from './branch-opening-hours.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BranchServiceModule } from 'src/modules/branch-service/branch-service.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, BranchOpeningHours]),
    AuthModule, // ← provides JwtStrategy + PassportModule for JwtAuthGuard
    BranchServiceModule,
  ],
  controllers: [BranchController],
  providers: [BranchService, BranchOpeningHoursService, RolesGuard],
  exports: [BranchService],
})
export class BranchModule {}
