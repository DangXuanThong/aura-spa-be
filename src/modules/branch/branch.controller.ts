import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch } from './entities/branch.entity';
import { BranchStatus } from './enums/branch-status.enum';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // ── Owner-only: mutating routes ──────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Branch created successfully', type: Branch })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async create(@Body() createBranchDto: CreateBranchDto): Promise<Branch> {
    return this.branchService.create(createBranchDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Branch updated successfully', type: Branch })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto): Promise<Branch> {
    return this.branchService.update(id, updateBranchDto);
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
  @ApiOkResponse({ description: 'List of branches', type: [Branch] })
  async findAll(@Query('status') status?: BranchStatus): Promise<Branch[]> {
    return this.branchService.findAll(status);
  }

  @Get('by-code/:code')
  @ApiOkResponse({ description: 'Branch found by code', type: Branch })
  async findByCode(@Param('code') code: string): Promise<Branch> {
    return this.branchService.findByCode(code);
  }

  @Get('by-city/:city')
  @ApiOkResponse({ description: 'Branches by city', type: [Branch] })
  async getByCity(@Param('city') city: string): Promise<Branch[]> {
    return this.branchService.getByCity(city);
  }

  @Get('nearby')
  @ApiOkResponse({ description: 'Nearby branches', type: [Branch] })
  async getNearby(@Query('latitude') latitude: number, @Query('longitude') longitude: number, @Query('radius') radius?: number): Promise<Branch[]> {
    return this.branchService.getNearby(latitude, longitude, radius);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Branch found', type: Branch })
  async findOne(@Param('id') id: string): Promise<Branch> {
    return this.branchService.findOne(id);
  }
}
