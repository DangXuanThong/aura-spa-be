import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { LoyaltySummaryDto } from './dto/loyalty-summary.dto';
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
}
