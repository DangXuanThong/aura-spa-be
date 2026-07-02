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

  // ── Customer: view own health records ───────────────────────────────────

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'All health records for the authenticated customer', type: [HealthRecordResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required' })
  async findMine(@Request() req: any): Promise<HealthRecordResponseDto[]> {
    const records = await this.healthService.findMyRecord(req.user.id);
    return plainToInstance(HealthRecordResponseDto, records);
  }

  // ── Staff/Manager/Owner: view (UC20 — Update Customer Health Record) ───────

  @Get('customer/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff, UserRole.Manager, UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Health records for the given customer. Staff/Manager scoped to their branches; Owner sees all.', type: [HealthRecordResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff, Manager or Owner role required' })
  async findByCustomer(@Param('customerId') customerId: string, @Request() req: any): Promise<HealthRecordResponseDto[]> {
    const records = await this.healthService.findByCustomer(customerId, req.user.id, req.user.role);
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
