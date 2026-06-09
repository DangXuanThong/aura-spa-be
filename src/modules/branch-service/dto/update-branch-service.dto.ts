import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchServiceDto } from './create-branch-service.dto';

export class UpdateBranchServiceDto extends PartialType(CreateBranchServiceDto) {}
