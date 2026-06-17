import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
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
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { PaymentService } from './payment.service';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@ApiTags('Payments')
@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── Staff: generate invoice (UC24) ──────────────────────────────────────

  @Post('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Invoice generated', type: InvoiceResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required or not active at this branch' })
  @ApiBadRequestResponse({ description: 'Booking status not eligible for invoicing' })
  async generateInvoice(@Body() dto: GenerateInvoiceDto, @Request() req: any): Promise<InvoiceResponseDto> {
    const invoice = await this.paymentService.generateInvoice(dto, req.user.id);
    return plainToInstance(InvoiceResponseDto, invoice);
  }

  // ── Authenticated: get invoice by ID (UC24) ──────────────────────────────

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Invoice detail', type: InvoiceResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async findOne(@Param('id') id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.paymentService.findOne(id);
    return plainToInstance(InvoiceResponseDto, invoice);
  }

  // ── Staff: record counter payment (UC24) ─────────────────────────────────

  @Post('invoices/:id/pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Payment recorded', type: PaymentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required' })
  @ApiBadRequestResponse({ description: 'Invoice not in payable state or amount exceeds balance' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async processPayment(@Param('id') id: string, @Body() dto: ProcessPaymentDto, @Request() req: any): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.processPayment(id, dto, req.user.id);
    return plainToInstance(PaymentResponseDto, payment);
  }
}
