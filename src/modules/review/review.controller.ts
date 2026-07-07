import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ── Public: list published reviews ─────────────────────────────────────────

  @Get()
  @ApiOkResponse({ description: 'Published reviews, filterable by branch/service/technician', type: [ReviewResponseDto] })
  @ApiQuery({ name: 'branchId', type: String, required: false })
  @ApiQuery({ name: 'serviceId', type: String, required: false })
  @ApiQuery({ name: 'technicianId', type: String, required: false })
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('technicianId') technicianId?: string,
  ): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewService.findAll(branchId, serviceId, technicianId);
    return plainToInstance(ReviewResponseDto, reviews);
  }

  // ── Customer: submit review (UC17 — Submit Service Review) ──────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Review submitted and published', type: ReviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required or booking does not belong to caller' })
  @ApiBadRequestResponse({ description: 'Booking is not in Completed status' })
  @ApiConflictResponse({ description: 'Review already submitted for this appointment' })
  async create(@Body() dto: CreateReviewDto, @Request() req: any): Promise<ReviewResponseDto> {
    const review = await this.reviewService.create(dto, req.user.id);
    return plainToInstance(ReviewResponseDto, review);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'All reviews submitted by the authenticated customer', type: [ReviewResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required' })
  async findMine(@Request() req: any): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewService.findMyReviews(req.user.id);
    return plainToInstance(ReviewResponseDto, reviews);
  }

  // ── Manager/Owner: reply to a review ────────────────────────────────────────

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Reply submitted', type: ReviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Manager or Owner role required' })
  async replyToReview(@Param('id') id: string, @Body() dto: ReplyReviewDto, @Request() req: any): Promise<ReviewResponseDto> {
    const review = await this.reviewService.reply(id, dto, req.user.id);
    return plainToInstance(ReviewResponseDto, review);
  }

  // ── Owner: moderate a review ─────────────────────────────────────────────────

  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Review status updated', type: ReviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Owner role required' })
  async moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto): Promise<ReviewResponseDto> {
    const review = await this.reviewService.moderate(id, dto);
    return plainToInstance(ReviewResponseDto, review);
  }
}
