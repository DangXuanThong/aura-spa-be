import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { NotificationService } from './notification.service';
import { buildSuccessResponse } from 'src/common/dto/api-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Staff, UserRole.Customer)
  async findAll(@Request() req: any) {
    const user = req.user as { id: string; role: string };
    const data =
      user.role === UserRole.Owner
        ? await this.notificationService.findForOwner(user.id)
        : await this.notificationService.findForUser(user.id, user.role);
    return buildSuccessResponse(data);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Staff, UserRole.Customer)
  async markRead(@Param('id') id: string, @Request() req: any) {
    await this.notificationService.markRead(id, req.user.id);
  }
}
