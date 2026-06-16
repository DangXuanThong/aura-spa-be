import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchOpeningHours } from './entities/branch-opening-hours.entity';
import { BranchService } from './branch.service';

@Injectable()
export class BranchOpeningHoursService {
  constructor(
    @InjectRepository(BranchOpeningHours)
    private readonly repo: Repository<BranchOpeningHours>,
    private readonly branchService: BranchService,
  ) {}

  async findByBranch(branchId: string): Promise<BranchOpeningHours[]> {
    await this.branchService.findOne(branchId); // throws 404 if branch not found
    return this.repo.find({
      where: { branchId },
      order: { dayOfWeek: 'ASC' },
    });
  }
}
