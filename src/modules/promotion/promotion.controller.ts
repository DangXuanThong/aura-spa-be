import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionResponseDto } from './dto/promotion-response.dto';
import { PromotionStatus } from './enums/promotion-status.enum';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  // ── Owner-only: mutating routes ──────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Promotion created successfully', type: PromotionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async create(@Body() dto: CreatePromotionDto): Promise<PromotionResponseDto> {
    const result = await this.promotionService.create(dto);
    return plainToInstance(PromotionResponseDto, result);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Promotion updated successfully', type: PromotionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async update(@Param('id') id: string, @Body() dto: UpdatePromotionDto): Promise<PromotionResponseDto> {
    const result = await this.promotionService.update(id, dto);
    return plainToInstance(PromotionResponseDto, result);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.promotionService.remove(id);
  }

  // ── Public: read-only routes (UC07 — Guest View Promotions) ─────────────

  @Get()
  @ApiOkResponse({ description: 'List of promotions. No status filter = currently active only.', type: [PromotionResponseDto] })
  @ApiQuery({ name: 'status', enum: PromotionStatus, enumName: 'PromotionStatus', required: false })
  @ApiQuery({ name: 'branchId', type: String, required: false, description: 'Filter to system-wide + specific branch' })
  async findAll(@Query('status') status?: PromotionStatus, @Query('branchId') branchId?: string): Promise<PromotionResponseDto[]> {
    const results = await this.promotionService.findAll(status, branchId);
    return plainToInstance(PromotionResponseDto, results);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Promotion found', type: PromotionResponseDto })
  async findOne(@Param('id') id: string): Promise<PromotionResponseDto> {
    const result = await this.promotionService.findOne(id);
    return plainToInstance(PromotionResponseDto, result);
  }
}
