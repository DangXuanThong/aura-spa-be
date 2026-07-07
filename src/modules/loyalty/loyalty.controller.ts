import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { LoyaltySummaryDto, RedeemPointsResponseDto } from './dto/loyalty-summary.dto';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  @Roles(UserRole.Customer)
  async getMine(@Request() req: any): Promise<LoyaltySummaryDto> {
    return this.loyaltyService.getSummary(req.user.id);
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.Customer)
  async redeem(@Request() req: any, @Body() dto: RedeemPointsDto): Promise<RedeemPointsResponseDto> {
    return this.loyaltyService.redeemPoints(req.user.id, dto.points, dto.description);
  }
}
