import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';
import { ServiceStatus } from './enums/service-status.enum';
import { ServiceService } from './service.service';

@ApiTags('Services')
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  // ── Owner-only: mutating routes ──────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Service created successfully', type: Service })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async create(@Body() createServiceDto: CreateServiceDto): Promise<Service> {
    return this.serviceService.create(createServiceDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Service updated successfully', type: Service })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto): Promise<Service> {
    return this.serviceService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.serviceService.remove(id);
  }

  // ── Public: read-only routes ─────────────────────────────────────────────

  @Get()
  @ApiOkResponse({ description: 'List of services', type: [Service] })
  async findAll(@Query('status') status?: ServiceStatus): Promise<Service[]> {
    return this.serviceService.findAll(status);
  }

  @Get('by-code/:code')
  @ApiOkResponse({ description: 'Service found by code', type: Service })
  async findByCode(@Param('code') code: string): Promise<Service> {
    return this.serviceService.findByCode(code);
  }

  @Get('by-slug/:slug')
  @ApiOkResponse({ description: 'Service found by slug', type: Service })
  async findBySlug(@Param('slug') slug: string): Promise<Service> {
    return this.serviceService.findBySlug(slug);
  }

  @Get('category/:category')
  @ApiOkResponse({ description: 'Services by category', type: [Service] })
  async getByCategory(@Param('category') category: string): Promise<Service[]> {
    return this.serviceService.getServicesByCategory(category);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Service found', type: Service })
  async findOne(@Param('id') id: string): Promise<Service> {
    return this.serviceService.findOne(id);
  }
}
