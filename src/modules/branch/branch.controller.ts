import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BranchHealthResponseDto } from './dto/branch-health-response.dto';
import { BranchService } from './branch.service';

@ApiTags('branches')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get('health')
  @ApiOkResponse({ type: BranchHealthResponseDto })
  async getHealth(): Promise<BranchHealthResponseDto> {
    const activeBranchCount = await this.branchService.countActiveBranches();

    return {
      success: true,
      data: {
        module: 'branch',
        status: 'ready',
        activeBranchCount,
      },
    };
  }
}
