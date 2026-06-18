import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { BranchStaffService } from './branch-staff.service';
import { SlotConfigService } from './slot-config.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import { UpdateSlotConfigDto } from './dto/update-slot-config.dto';
import { SlotConfigResponseDto } from './dto/slot-config-response.dto';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
export class BranchStaffController {
  constructor(
    private readonly branchStaffService: BranchStaffService,
    private readonly slotConfigService: SlotConfigService,
  ) {}

  // ── UC25: List staff ────────────────────────────────────────────────────────

  @Get(':branchId/staff')
  @ApiOkResponse({ description: 'Staff list for branch', type: [StaffResponseDto] })
  async list(@Param('branchId') branchId: string, @Request() req: any): Promise<StaffResponseDto[]> {
    const assignments = await this.branchStaffService.list(branchId, req.user.id);
    return plainToInstance(StaffResponseDto, assignments);
  }

  // ── UC25: Get one staff member ──────────────────────────────────────────────

  @Get(':branchId/staff/:userId')
  @ApiOkResponse({ description: 'Staff member detail', type: StaffResponseDto })
  @ApiNotFoundResponse({ description: 'Staff member not found at this branch' })
  async findOne(@Param('branchId') branchId: string, @Param('userId') userId: string, @Request() req: any): Promise<StaffResponseDto> {
    const assignment = await this.branchStaffService.findOne(branchId, userId, req.user.id);
    return plainToInstance(StaffResponseDto, assignment);
  }

  // ── UC25: Create staff account ──────────────────────────────────────────────

  @Post(':branchId/staff')
  @ApiCreatedResponse({ description: 'Staff account created and assigned to branch', type: StaffResponseDto })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async create(@Param('branchId') branchId: string, @Body() dto: CreateStaffDto, @Request() req: any): Promise<StaffResponseDto> {
    const assignment = await this.branchStaffService.create(branchId, dto, req.user.id);
    return plainToInstance(StaffResponseDto, assignment);
  }

  // ── UC25: Edit staff account / position ────────────────────────────────────

  @Patch(':branchId/staff/:userId')
  @ApiOkResponse({ description: 'Staff account updated', type: StaffResponseDto })
  @ApiConflictResponse({ description: 'Email already in use' })
  @ApiNotFoundResponse({ description: 'Staff member not found at this branch' })
  async update(
    @Param('branchId') branchId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateStaffDto,
    @Request() req: any,
  ): Promise<StaffResponseDto> {
    const assignment = await this.branchStaffService.update(branchId, userId, dto, req.user.id);
    return plainToInstance(StaffResponseDto, assignment);
  }

  // ── UC25: Deactivate staff ──────────────────────────────────────────────────

  @Patch(':branchId/staff/:userId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Staff member deactivated', type: StaffResponseDto })
  @ApiBadRequestResponse({ description: 'Staff already inactive or self-deactivation attempt' })
  @ApiNotFoundResponse({ description: 'Staff member not found at this branch' })
  async deactivate(@Param('branchId') branchId: string, @Param('userId') userId: string, @Request() req: any): Promise<StaffResponseDto> {
    const assignment = await this.branchStaffService.deactivate(branchId, userId, req.user.id);
    return plainToInstance(StaffResponseDto, assignment);
  }

  // ── UC27: List slot configs ─────────────────────────────────────────────────

  @Get(':branchId/slot-configs')
  @ApiOkResponse({ description: 'Booking slot configs for the branch', type: [SlotConfigResponseDto] })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async listSlotConfigs(@Param('branchId') branchId: string, @Request() req: any): Promise<SlotConfigResponseDto[]> {
    const configs = await this.slotConfigService.list(branchId, req.user.id);
    return plainToInstance(SlotConfigResponseDto, configs);
  }

  // ── UC27: Update slot config ────────────────────────────────────────────────

  @Patch(':branchId/slot-configs/:id')
  @ApiOkResponse({ description: 'Slot config updated', type: SlotConfigResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid time range' })
  @ApiNotFoundResponse({ description: 'Slot config not found for this branch' })
  async updateSlotConfig(
    @Param('branchId') branchId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSlotConfigDto,
    @Request() req: any,
  ): Promise<SlotConfigResponseDto> {
    const config = await this.slotConfigService.update(branchId, id, dto, req.user.id);
    return plainToInstance(SlotConfigResponseDto, config);
  }
}
