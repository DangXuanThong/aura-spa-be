import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
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
  async findMine(@Request() req: any): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingService.findMyBookings(req.user.id);
    return plainToInstance(
      BookingResponseDto,
      bookings.map((b) => ({ ...b, services: [] })),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Booking detail', type: BookingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<BookingResponseDto> {
    const booking = await this.bookingService.findOne(id, req.user.id, req.user.role);
    return plainToInstance(BookingResponseDto, { ...booking, services: [] });
  }
}
