import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import {
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
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionResponseDto } from './dto/promotion-response.dto';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';
import { UpdateDiscountCodeDto } from './dto/update-discount-code.dto';
import { DiscountCodeResponseDto } from './dto/discount-code-response.dto';
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

  // ── UC35: Owner — list all promotions (all statuses) ────────────────────

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'All promotions regardless of status', type: [PromotionResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  @ApiQuery({ name: 'status', enum: PromotionStatus, required: false })
  async findAllForOwner(@Query('status') status?: PromotionStatus): Promise<PromotionResponseDto[]> {
    const results = await this.promotionService.findAllForOwner(status);
    return plainToInstance(PromotionResponseDto, results);
  }

  // ── UC35: Owner — discount code management ───────────────────────────────

  @Get('eligible-codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Discount codes currently available to the authenticated customer' })
  @ApiQuery({ name: 'branchId', type: String, required: false })
  async findEligibleCodes(@Request() req: any, @Query('branchId') branchId?: string): Promise<any[]> {
    return this.promotionService.findEligibleCodesForCustomer(req.user.id, branchId);
  }

  @Get(':id/discount-codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Discount codes for the promotion', type: [DiscountCodeResponseDto] })
  @ApiNotFoundResponse({ description: 'Promotion not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async listDiscountCodes(@Param('id') id: string): Promise<DiscountCodeResponseDto[]> {
    const codes = await this.promotionService.listDiscountCodes(id);
    return plainToInstance(DiscountCodeResponseDto, codes);
  }

  @Post(':id/discount-codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Discount code created', type: DiscountCodeResponseDto })
  @ApiNotFoundResponse({ description: 'Promotion not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async createDiscountCode(@Param('id') id: string, @Body() dto: CreateDiscountCodeDto): Promise<DiscountCodeResponseDto> {
    const code = await this.promotionService.createDiscountCode(id, dto);
    return plainToInstance(DiscountCodeResponseDto, code);
  }

  @Patch(':id/discount-codes/:codeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Discount code updated', type: DiscountCodeResponseDto })
  @ApiNotFoundResponse({ description: 'Promotion or discount code not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async updateDiscountCode(
    @Param('id') id: string,
    @Param('codeId') codeId: string,
    @Body() dto: UpdateDiscountCodeDto,
  ): Promise<DiscountCodeResponseDto> {
    const code = await this.promotionService.updateDiscountCode(id, codeId, dto);
    return plainToInstance(DiscountCodeResponseDto, code);
  }

  @Delete(':id/discount-codes/:codeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNotFoundResponse({ description: 'Promotion or discount code not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async removeDiscountCode(@Param('id') id: string, @Param('codeId') codeId: string): Promise<void> {
    return this.promotionService.removeDiscountCode(id, codeId);
  }

  // ── Public: read-only routes (UC07 — Guest View Promotions) ─────────────

  @Get()
  @ApiOkResponse({
    description: 'Currently active promotions (status=Active, within date range). Status filter is not available to guests.',
    type: [PromotionResponseDto],
  })
  @ApiQuery({ name: 'branchId', type: String, required: false, description: 'Filter to system-wide + specific branch' })
  async findAll(@Query('branchId') branchId?: string): Promise<PromotionResponseDto[]> {
    const results = await this.promotionService.findAll(undefined, branchId);
    return plainToInstance(PromotionResponseDto, results);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Promotion found', type: PromotionResponseDto })
  async findOne(@Param('id') id: string): Promise<PromotionResponseDto> {
    const result = await this.promotionService.findOne(id);
    return plainToInstance(PromotionResponseDto, result);
  }
}
