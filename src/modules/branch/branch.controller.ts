import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { BranchService } from './branch.service';
import { BranchOpeningHoursService } from './branch-opening-hours.service';
import { BranchServiceService } from 'src/modules/branch-service/branch-service.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchResponseDto } from './dto/branch-response.dto';
import { BranchOpeningHoursResponseDto } from './dto/branch-opening-hours-response.dto';
import { BranchServiceDetailResponseDto } from './dto/branch-service-detail-response.dto';
import { BranchStatus } from './enums/branch-status.enum';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
  constructor(
    private readonly branchService: BranchService,
    private readonly branchOpeningHoursService: BranchOpeningHoursService,
    private readonly branchServiceService: BranchServiceService,
  ) {}

  // ── Owner-only: mutating routes ──────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Branch created successfully', type: BranchResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async create(@Body() createBranchDto: CreateBranchDto): Promise<BranchResponseDto> {
    const branch = await this.branchService.create(createBranchDto);
    return plainToInstance(BranchResponseDto, branch);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Branch updated successfully', type: BranchResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto): Promise<BranchResponseDto> {
    const branch = await this.branchService.update(id, updateBranchDto);
    return plainToInstance(BranchResponseDto, branch);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.branchService.remove(id);
  }

  // ── Public: read-only routes ─────────────────────────────────────────────

  @Get()
  @ApiOkResponse({ description: 'List of branches', type: [BranchResponseDto] })
  @ApiQuery({ name: 'status', enum: BranchStatus, enumName: 'BranchStatus', required: false })
  @ApiQuery({ name: 'search', type: String, required: false, description: 'Filter by branch name (case-insensitive)' })
  async findAll(@Query('status') status?: BranchStatus, @Query('search') search?: string): Promise<BranchResponseDto[]> {
    const branches = await this.branchService.findAll(status, search);
    return plainToInstance(BranchResponseDto, branches);
  }

  @Get('by-code/:code')
  @ApiOkResponse({ description: 'Branch found by code', type: BranchResponseDto })
  async findByCode(@Param('code') code: string): Promise<BranchResponseDto> {
    const branch = await this.branchService.findByCode(code);
    return plainToInstance(BranchResponseDto, branch);
  }

  @Get('by-city/:city')
  @ApiOkResponse({ description: 'Branches by city', type: [BranchResponseDto] })
  async getByCity(@Param('city') city: string): Promise<BranchResponseDto[]> {
    const branches = await this.branchService.getByCity(city);
    return plainToInstance(BranchResponseDto, branches);
  }

  @Get('nearby')
  @ApiOkResponse({ description: 'Nearby branches', type: [BranchResponseDto] })
  async getNearby(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
  ): Promise<BranchResponseDto[]> {
    const branches = await this.branchService.getNearby(latitude, longitude, radius);
    return plainToInstance(BranchResponseDto, branches);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Branch found', type: BranchResponseDto })
  async findOne(@Param('id') id: string): Promise<BranchResponseDto> {
    const branch = await this.branchService.findOne(id);
    return plainToInstance(BranchResponseDto, branch);
  }

  // UC05 — Guest Browsing: branch sub-resources ────────────────────────────

  @Get(':id/opening-hours')
  @ApiOkResponse({ description: 'Opening hours for a branch ordered by day of week', type: [BranchOpeningHoursResponseDto] })
  async getOpeningHours(@Param('id') id: string): Promise<BranchOpeningHoursResponseDto[]> {
    const hours = await this.branchOpeningHoursService.findByBranch(id);
    return plainToInstance(BranchOpeningHoursResponseDto, hours);
  }

  @Get(':id/services')
  @ApiOkResponse({ description: 'Services offered at this branch with effective pricing and duration', type: [BranchServiceDetailResponseDto] })
  async getBranchServices(@Param('id') id: string): Promise<BranchServiceDetailResponseDto[]> {
    const items = await this.branchServiceService.getEnabledServicesWithDetailsByBranch(id);
    return items.map((bs) =>
      plainToInstance(BranchServiceDetailResponseDto, {
        id: bs.id,
        branchId: bs.branchId,
        serviceId: bs.serviceId,
        isEnabled: bs.isEnabled,
        effectiveDurationMinutes: bs.durationMinutesOverride ?? bs.service!.defaultDurationMinutes,
        effectivePrice: parseFloat((bs.priceOverride ?? bs.service!.defaultPrice) as unknown as string),
        maxParallelBookings: bs.maxParallelBookings,
        service: bs.service,
      }),
    );
  }
}
