import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BranchHealthResponseDto } from './dto/branch-health-response.dto';
import { BranchService } from './branch.service';
import { ApiResponse, buildSuccessResponse } from 'src/common/dto/api-response.dto';

interface BranchHealthData {
  module: 'branch';
  status: 'ready';
  activeBranchCount: number;
}

@ApiTags('branches')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get('health')
  @ApiOkResponse({ type: BranchHealthResponseDto })
  async getHealth(): Promise<ApiResponse<BranchHealthData>> {
    const activeBranchCount = await this.branchService.countActiveBranches();

    return buildSuccessResponse({
      module: 'branch',
      status: 'ready',
      activeBranchCount,
    });
  }
}
