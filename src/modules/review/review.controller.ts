import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
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
import { ReviewResponseDto } from './dto/review-response.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

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
}
