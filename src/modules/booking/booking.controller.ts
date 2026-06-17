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
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { TransferBookingDto } from './dto/transfer-booking.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CreateWalkInBookingDto } from './dto/create-walk-in-booking.dto';
import { AvailableSlotsResponseDto } from './dto/available-slots-response.dto';
import { BookingResponseDto } from './dto/booking-response.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly availabilityService: BookingAvailabilityService,
    private readonly bookingService: BookingService,
  ) {}

  // ── Public: slot availability (UC09) ────────────────────────────────────

  @Get('availability')
  @ApiOkResponse({ description: 'Available booking slots for a branch + service on a given date', type: AvailableSlotsResponseDto })
  @ApiQuery({ name: 'branchId', type: String, required: true })
  @ApiQuery({ name: 'serviceId', type: String, required: true })
  @ApiQuery({ name: 'date', type: String, required: true, description: 'Local date in YYYY-MM-DD format' })
  async getAvailableSlots(
    @Query('branchId') branchId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ): Promise<AvailableSlotsResponseDto> {
    return this.availabilityService.getAvailableSlots(branchId, serviceId, date);
  }

  // ── Customer: booking routes (UC10 — Book Appointment) ──────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Appointment booked successfully', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required' })
  async create(@Body() dto: CreateBookingDto, @Request() req: any): Promise<BookingResponseDto> {
    const booking = await this.bookingService.create(dto, req.user.id);
    return plainToInstance(BookingResponseDto, { ...booking, services: [] });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Bookings for the authenticated customer, ordered by start time descending', type: [BookingResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required' })
  // ── Customer: booking history (UC15 — View Booking History) ────────────────
  async findMine(@Request() req: any): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingService.findMyBookings(req.user.id);
    return plainToInstance(BookingResponseDto, bookings);
  }

  // ── Customer: reschedule routes (UC11 — Reschedule Appointment) ────────────

  @Patch(':id/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Appointment rescheduled — returns the new booking', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required or booking does not belong to the caller' })
  @ApiBadRequestResponse({ description: 'Booking is not in a reschedulable status, or new start time is in the past' })
  @ApiConflictResponse({ description: 'The requested time slot is fully booked' })
  async reschedule(@Param('id') id: string, @Body() dto: RescheduleBookingDto, @Request() req: any): Promise<BookingResponseDto> {
    const newBooking = await this.bookingService.reschedule(id, dto, req.user.id);
    return plainToInstance(BookingResponseDto, { ...newBooking, services: [] });
  }

  // ── Customer: transfer routes (UC13 — Transfer Appointment to Another Branch) ──

  @Patch(':id/transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Appointment transferred — returns the new booking at the destination branch', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required or booking does not belong to the caller' })
  @ApiBadRequestResponse({ description: 'Booking is not confirmed, start time is in the past, or same branch selected' })
  @ApiConflictResponse({ description: 'The requested slot at the target branch is fully booked' })
  async transfer(@Param('id') id: string, @Body() dto: TransferBookingDto, @Request() req: any): Promise<BookingResponseDto> {
    const newBooking = await this.bookingService.transfer(id, dto, req.user.id);
    return plainToInstance(BookingResponseDto, { ...newBooking, services: [] });
  }

  // ── Customer: cancel routes (UC12 — Cancel Appointment) ─────────────────

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Appointment cancelled — returns the updated booking', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required or booking does not belong to the caller' })
  @ApiBadRequestResponse({ description: 'Booking is not cancellable or has already started' })
  async cancel(@Param('id') id: string, @Body() dto: CancelBookingDto, @Request() req: any): Promise<BookingResponseDto> {
    const booking = await this.bookingService.cancel(id, dto, req.user.id);
    return plainToInstance(BookingResponseDto, { ...booking, services: [] });
  }

  // ── Customer: discount routes (UC14 — Apply Discount Code) ──────────────

  @Patch(':id/apply-discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Discount applied — returns the updated booking with recalculated amounts', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required or booking does not belong to the caller' })
  @ApiBadRequestResponse({ description: 'Code invalid, expired, usage limit reached, or booking not eligible' })
  async applyDiscount(@Param('id') id: string, @Body() dto: ApplyDiscountDto, @Request() req: any): Promise<BookingResponseDto> {
    const booking = await this.bookingService.applyDiscount(id, dto, req.user.id);
    return plainToInstance(BookingResponseDto, { ...booking, services: [] });
  }

  // ── Staff: walk-in booking (UC19 — Create Walk-in Appointment) ─────────

  @Post('walk-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Walk-in appointment created and checked in', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required or caller is not active at this branch' })
  @ApiBadRequestResponse({ description: 'Start time is not today, or service unavailable at branch' })
  @ApiConflictResponse({ description: 'The selected time slot is fully booked' })
  async createWalkIn(@Body() dto: CreateWalkInBookingDto, @Request() req: any): Promise<BookingResponseDto> {
    const booking = await this.bookingService.createWalkIn(dto, req.user.id);
    return plainToInstance(BookingResponseDto, { ...booking, services: [] });
  }

  // ── Staff: check-in (UC18 — Check In Customer) ──────────────────────────

  @Patch(':id/check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Customer checked in — booking status updated to checked_in', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required or caller is not active at this branch' })
  @ApiBadRequestResponse({ description: 'Booking is not in Confirmed status' })
  async checkIn(@Param('id') id: string, @Request() req: any): Promise<BookingResponseDto> {
    const booking = await this.bookingService.checkIn(id, req.user.id);
    return plainToInstance(BookingResponseDto, { ...booking, services: [] });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Booking detail', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<BookingResponseDto> {
    const booking = await this.bookingService.findOne(id, req.user.id, req.user.role);
    return plainToInstance(BookingResponseDto, booking);
  }
}
