import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards } from '@nestjs/common';
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
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { InvoicePaymentQrResponseDto } from './dto/invoice-payment-qr-response.dto';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff, UserRole.Manager, UserRole.Owner, UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Invoice detail', type: InvoiceResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<InvoiceResponseDto> {
    const invoice = await this.paymentService.findOne(id, req.user);
    return plainToInstance(InvoiceResponseDto, invoice);
  }

  @Post('invoices/:id/payment-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'SePay QR generated for invoice remaining payment', type: InvoicePaymentQrResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required or not active at this branch' })
  @ApiBadRequestResponse({ description: 'Invoice is not payable with SePay QR' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async createInvoicePaymentQr(@Param('id') id: string, @Request() req: any): Promise<InvoicePaymentQrResponseDto> {
    return this.paymentService.createInvoicePaymentQr(id, req.user.id);
  }

  @Get('invoices/:id/payment-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Latest SePay QR status for invoice remaining payment', type: InvoicePaymentQrResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required or not active at this branch' })
  @ApiNotFoundResponse({ description: 'Invoice or QR not found' })
  async getInvoicePaymentQr(@Param('id') id: string, @Request() req: any): Promise<InvoicePaymentQrResponseDto> {
    return this.paymentService.getInvoicePaymentQr(id, req.user.id);
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

  // ── Manager/Owner: refund a payment (UC24) ───────────────────────────────

  @Post('payments/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Manager, UserRole.Owner)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Payment refunded — returns updated payment record', type: PaymentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Manager or Owner role required, or not active at this branch' })
  @ApiBadRequestResponse({ description: 'Refund amount exceeds balance or payment not in refundable state' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async refundPayment(@Param('id') id: string, @Body() dto: RefundPaymentDto, @Request() req: any): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.refund(id, dto, req.user.id, req.user.role);
    return plainToInstance(PaymentResponseDto, payment);
  }
}
