import { PartialType } from '@nestjs/swagger';
import { CreateBranchServiceDto } from './create-branch-service.dto';

export class UpdateBranchServiceDto extends PartialType(CreateBranchServiceDto) {}
