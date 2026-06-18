import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { ReportService } from './report.service';
import { BranchPerformanceReportDto } from './dto/branch-performance-report.dto';
import { RevenueDashboardDto, TrendGranularity } from './dto/revenue-dashboard.dto';

class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

class DashboardQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsEnum(TrendGranularity)
  granularity?: TrendGranularity;
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

  // ── UC36: Owner — cross-branch revenue dashboard ─────────────────────────────

  @Get('revenue-dashboard')
  @Roles(UserRole.Owner)
  @ApiOkResponse({ description: 'Aggregated revenue across all branches with trend data', type: RevenueDashboardDto })
  @ApiQuery({ name: 'from', required: false, description: 'Period start (ISO date). Defaults to 30 days ago.' })
  @ApiQuery({ name: 'to', required: false, description: 'Period end (ISO date). Defaults to now.' })
  @ApiQuery({
    name: 'granularity',
    enum: TrendGranularity,
    enumName: 'TrendGranularity',
    required: false,
    description: 'Trend bucket size. Defaults to day.',
  })
  async getRevenueDashboard(@Query() query: DashboardQueryDto): Promise<RevenueDashboardDto> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const granularity = query.granularity ?? TrendGranularity.Day;
    return this.reportService.getRevenueDashboard(from, to, granularity);
  }

  // ── UC31: Branch performance report ──────────────────────────────────────────

  @Get('branch/:branchId')
  @ApiOkResponse({ description: 'Revenue summary and staff performance for the branch', type: BranchPerformanceReportDto })
  @ApiQuery({ name: 'from', required: false, description: 'Period start (ISO date). Defaults to 30 days ago.' })
  @ApiQuery({ name: 'to', required: false, description: 'Period end (ISO date). Defaults to now.' })
  async getBranchPerformance(
    @Param('branchId') branchId: string,
    @Query() query: ReportQueryDto,
    @Request() req: { user: { id: string } },
  ): Promise<BranchPerformanceReportDto> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.reportService.getBranchPerformance(branchId, req.user.id, from, to);
  }
}
