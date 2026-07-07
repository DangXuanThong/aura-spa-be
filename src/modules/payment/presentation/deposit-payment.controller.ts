import { Controller, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { CreateDepositPaymentCommand } from '../application/commands/create-deposit-payment.command';
import { GetPaymentByBookingQuery } from '../application/queries/get-payment-by-booking.query';
import { DepositPaymentResponseDto } from '../application/dto/deposit-payment-response.dto';
import { CreateDepositPaymentHandler } from '../application/handlers/create-deposit-payment.handler';
import { GetPaymentByBookingHandler } from '../application/handlers/get-payment-by-booking.handler';

@ApiTags('Bookings')
@Controller('bookings')
export class DepositPaymentController {
  constructor(
    private readonly createDepositPaymentHandler: CreateDepositPaymentHandler,
    private readonly getPaymentByBookingHandler: GetPaymentByBookingHandler,
  ) {}

  @Post(':id/deposit-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Deposit payment QR created', type: DepositPaymentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required' })
  @ApiBadRequestResponse({ description: 'Booking not awaiting deposit payment' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  async createDepositPayment(@Param('id') bookingId: string, @Request() req: any): Promise<DepositPaymentResponseDto> {
    return this.createDepositPaymentHandler.execute(new CreateDepositPaymentCommand(bookingId, req.user.id));
  }

  @Get(':id/deposit-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Deposit payment status (for polling)', type: DepositPaymentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required' })
  @ApiNotFoundResponse({ description: 'Booking or payment not found' })
  async getDepositPayment(@Param('id') bookingId: string, @Request() req: any): Promise<DepositPaymentResponseDto> {
    return this.getPaymentByBookingHandler.execute(new GetPaymentByBookingQuery(bookingId, req.user.id));
  }
}
