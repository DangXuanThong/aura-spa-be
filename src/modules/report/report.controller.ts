import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { ReportService } from './report.service';
import { BranchPerformanceReportDto } from './dto/branch-performance-report.dto';

class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ── UC31: Branch performance report ──────────────────────────────────────────

  @Get('branch/:branchId')
  @ApiOkResponse({ description: 'Revenue summary and staff performance for the branch', type: BranchPerformanceReportDto })
  @ApiQuery({ name: 'from', required: false, description: 'Period start (ISO date). Defaults to 30 days ago.' })
  @ApiQuery({ name: 'to', required: false, description: 'Period end (ISO date). Defaults to now.' })
  async getBranchPerformance(
    @Param('branchId') branchId: string,
    @Query() query: ReportQueryDto,
    @Request() req: any,
  ): Promise<BranchPerformanceReportDto> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.reportService.getBranchPerformance(branchId, req.user.id, from, to);
  }
}
