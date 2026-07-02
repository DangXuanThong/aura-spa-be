import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { ReportService } from './report.service';
import { BranchPerformanceReportDto } from './dto/branch-performance-report.dto';
import { RevenueDashboardDto, TrendGranularity } from './dto/revenue-dashboard.dto';
import { BranchRankingsDto, PopularServicesRankingsDto, TopStaffRankingsDto } from './dto/performance-rankings.dto';

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

class RankingQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
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
  @Roles(UserRole.Owner, UserRole.Manager)
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
    return this.reportService.getBranchPerformance(branchId, req.user.id, req.user.role, from, to);
  }

  // ── UC37: Owner — performance rankings ───────────────────────────────────────

  @Get('rankings/staff')
  @Roles(UserRole.Owner)
  @ApiOkResponse({ description: 'Top-performing technicians across all branches ranked by completed services', type: TopStaffRankingsDto })
  @ApiQuery({ name: 'from', required: false, description: 'Period start (ISO date). Defaults to 30 days ago.' })
  @ApiQuery({ name: 'to', required: false, description: 'Period end (ISO date). Defaults to now.' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (1–50). Defaults to 10.' })
  async getTopStaffRankings(@Query() query: RankingQueryDto): Promise<TopStaffRankingsDto> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.reportService.getTopStaffRankings(from, to, query.limit ?? 10);
  }

  @Get('rankings/services')
  @Roles(UserRole.Owner)
  @ApiOkResponse({ description: 'Most popular services ranked by number of completed bookings', type: PopularServicesRankingsDto })
  @ApiQuery({ name: 'from', required: false, description: 'Period start (ISO date). Defaults to 30 days ago.' })
  @ApiQuery({ name: 'to', required: false, description: 'Period end (ISO date). Defaults to now.' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (1–50). Defaults to 10.' })
  async getPopularServicesRankings(@Query() query: RankingQueryDto): Promise<PopularServicesRankingsDto> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.reportService.getPopularServicesRankings(from, to, query.limit ?? 10);
  }

  @Get('rankings/branches')
  @Roles(UserRole.Owner)
  @ApiOkResponse({ description: 'Best-performing branches ranked by total revenue', type: BranchRankingsDto })
  @ApiQuery({ name: 'from', required: false, description: 'Period start (ISO date). Defaults to 30 days ago.' })
  @ApiQuery({ name: 'to', required: false, description: 'Period end (ISO date). Defaults to now.' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (1–50). Defaults to 10.' })
  async getBranchRankings(@Query() query: RankingQueryDto): Promise<BranchRankingsDto> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.reportService.getBranchRankings(from, to, query.limit ?? 10);
  }

  @Get('manager-dashboard/:branchId')
  @Roles(UserRole.Owner, UserRole.Manager)
  @ApiOkResponse({ description: 'Overview stats for branch manager dashboard' })
  async getManagerDashboard(
    @Param('branchId') branchId: string,
    @Request() req: any,
  ): Promise<any> {
    return this.reportService.getManagerDashboard(branchId, req.user.id, req.user.role);
  }
}
