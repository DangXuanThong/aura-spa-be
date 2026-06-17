import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { HealthService } from './health.service';
import { UpsertHealthRecordDto } from './dto/upsert-health-record.dto';
import { HealthRecordResponseDto } from './dto/health-record-response.dto';

@ApiTags('Health Records')
@Controller('health-records')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // ── Staff: view (UC20 — Update Customer Health Record) ──────────────────

  @Get('customer/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'All health records for the given customer', type: [HealthRecordResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required' })
  async findByCustomer(@Param('customerId') customerId: string): Promise<HealthRecordResponseDto[]> {
    const records = await this.healthService.findByCustomer(customerId);
    return plainToInstance(HealthRecordResponseDto, records);
  }

  // ── Staff: upsert (UC20 — Update Customer Health Record) ────────────────

  @Put('customer/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Health record created or updated', type: HealthRecordResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff role required or caller is not active at this branch' })
  async upsert(@Param('customerId') customerId: string, @Body() dto: UpsertHealthRecordDto, @Request() req: any): Promise<HealthRecordResponseDto> {
    const record = await this.healthService.upsert(customerId, dto, req.user.id);
    return plainToInstance(HealthRecordResponseDto, record);
  }
}
