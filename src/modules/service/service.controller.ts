import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
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
  @ApiCreatedResponse({ description: 'Service created successfully', type: ServiceResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async create(@Body() createServiceDto: CreateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.serviceService.create(createServiceDto);
    return plainToInstance(ServiceResponseDto, service);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Service updated successfully', type: ServiceResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.serviceService.update(id, updateServiceDto);
    return plainToInstance(ServiceResponseDto, service);
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

  // ── Public: read-only routes (UC06 — Guest View Service Catalogue) ────────

  @Get()
  @ApiOkResponse({ description: 'List of services', type: [ServiceResponseDto] })
  @ApiQuery({ name: 'status', enum: ServiceStatus, enumName: 'ServiceStatus', required: false })
  async findAll(@Query('status') status?: ServiceStatus): Promise<ServiceResponseDto[]> {
    const services = await this.serviceService.findAll(status);
    return plainToInstance(ServiceResponseDto, services);
  }

  @Get('by-code/:code')
  @ApiOkResponse({ description: 'Service found by code', type: ServiceResponseDto })
  async findByCode(@Param('code') code: string): Promise<ServiceResponseDto> {
    const service = await this.serviceService.findByCode(code);
    return plainToInstance(ServiceResponseDto, service);
  }

  @Get('by-slug/:slug')
  @ApiOkResponse({ description: 'Service found by slug', type: ServiceResponseDto })
  async findBySlug(@Param('slug') slug: string): Promise<ServiceResponseDto> {
    const service = await this.serviceService.findBySlug(slug);
    return plainToInstance(ServiceResponseDto, service);
  }

  @Get('category/:category')
  @ApiOkResponse({ description: 'Services by category', type: [ServiceResponseDto] })
  async getByCategory(@Param('category') category: string): Promise<ServiceResponseDto[]> {
    const services = await this.serviceService.getServicesByCategory(category);
    return plainToInstance(ServiceResponseDto, services);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Service found', type: ServiceResponseDto })
  async findOne(@Param('id') id: string): Promise<ServiceResponseDto> {
    const service = await this.serviceService.findOne(id);
    return plainToInstance(ServiceResponseDto, service);
  }
}
