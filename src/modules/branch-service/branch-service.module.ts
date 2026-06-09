import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branch/entities/branch.entity';
import { Service } from '../service/entities/service.entity';
import { BranchServiceController } from './branch-service.controller';
import { BranchServiceService } from './branch-service.service';
import { BranchService } from './entities/branch-service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BranchService, Branch, Service])],
  controllers: [BranchServiceController],
  providers: [BranchServiceService],
  exports: [BranchServiceService],
})
export class BranchServiceModule {}
