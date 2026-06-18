import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { ScheduleService } from './schedule.service';
import { ApprovalStatus } from './enums/approval-status.enum';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';
import { ScheduleRequestResponseDto } from './dto/schedule-request-response.dto';
import { ScheduleRequestManagerResponseDto } from './dto/schedule-request-manager-response.dto';
import { TimetableDayDto } from './dto/timetable-day.dto';

@ApiTags('Schedule Requests')
@Controller('schedule-requests')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // ── Staff: submit request (UC21 — Register Work Schedule) ───────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Schedule request submitted and pending manager approval', type: ScheduleRequestResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required or caller is not active at this branch' })
  @ApiBadRequestResponse({ description: 'Invalid time range or start time is not in the future' })
  async create(@Body() dto: CreateScheduleRequestDto, @Request() req: any): Promise<ScheduleRequestResponseDto> {
    const request = await this.scheduleService.create(dto, req.user.id);
    return plainToInstance(ScheduleRequestResponseDto, request);
  }

  // ── Staff: personal timetable (UC22 — View Personal Schedule) ──────────

  @Get('timetable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Daily shift timetable with assigned customers for the given date range', type: [TimetableDayDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required' })
  @ApiBadRequestResponse({ description: 'to is before from' })
  @ApiQuery({ name: 'from', type: String, required: true, description: 'Start date YYYY-MM-DD (UTC)' })
  @ApiQuery({ name: 'to', type: String, required: true, description: 'End date YYYY-MM-DD (UTC)' })
  async getTimetable(@Query('from') from: string, @Query('to') to: string, @Request() req: any): Promise<TimetableDayDto[]> {
    return this.scheduleService.getMyTimetable(req.user.id, from, to);
  }

  // ── Staff: view own requests (UC21 — Register Work Schedule) ────────────

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'All schedule requests submitted by the authenticated staff member', type: [ScheduleRequestResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required' })
  async findMine(@Request() req: any): Promise<ScheduleRequestResponseDto[]> {
    const requests = await this.scheduleService.findMine(req.user.id);
    return plainToInstance(ScheduleRequestResponseDto, requests);
  }

  // ── Manager: list branch requests (UC26 — Assign Shifts) ────────────────

  @Get('branch/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Schedule requests for the branch', type: [ScheduleRequestManagerResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
  @ApiQuery({ name: 'status', enum: ApprovalStatus, enumName: 'ApprovalStatus', required: false })
  async listByBranch(
    @Param('branchId') branchId: string,
    @Query('status') status: ApprovalStatus | undefined,
    @Request() req: any,
  ): Promise<ScheduleRequestManagerResponseDto[]> {
    const requests = await this.scheduleService.listByBranch(branchId, req.user.id, status);
    return plainToInstance(ScheduleRequestManagerResponseDto, requests);
  }

  // ── Manager: approve request (UC26 — Assign Shifts) ─────────────────────

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Request approved and shift created', type: ScheduleRequestResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
  @ApiBadRequestResponse({ description: 'Request is not pending' })
  @ApiNotFoundResponse({ description: 'Schedule request not found' })
  async approve(@Param('id') id: string, @Request() req: any): Promise<ScheduleRequestResponseDto> {
    const request = await this.scheduleService.approve(id, req.user.id);
    return plainToInstance(ScheduleRequestResponseDto, request);
  }

  // ── Manager: reject request (UC26 — Assign Shifts) ──────────────────────

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Request rejected', type: ScheduleRequestResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
  @ApiBadRequestResponse({ description: 'Request is not pending' })
  @ApiNotFoundResponse({ description: 'Schedule request not found' })
  async reject(@Param('id') id: string, @Request() req: any): Promise<ScheduleRequestResponseDto> {
    const request = await this.scheduleService.reject(id, req.user.id);
    return plainToInstance(ScheduleRequestResponseDto, request);
  }

  // ── Staff: cancel pending request (UC21 — Register Work Schedule) ───────

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Schedule request cancelled', type: ScheduleRequestResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required or request does not belong to caller' })
  @ApiBadRequestResponse({ description: 'Request is not in pending status' })
  async cancel(@Param('id') id: string, @Request() req: any): Promise<ScheduleRequestResponseDto> {
    const request = await this.scheduleService.cancel(id, req.user.id);
    return plainToInstance(ScheduleRequestResponseDto, request);
  }
}
