import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BookingAvailabilityService } from './booking-availability.service';
import { AvailableSlotsResponseDto } from './dto/available-slots-response.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly availabilityService: BookingAvailabilityService) {}

  // UC09 — Search Branch & Service: browse available slots to plan a visit
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
}
