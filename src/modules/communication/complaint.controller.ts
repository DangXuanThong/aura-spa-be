import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { ComplaintService } from './complaint.service';
import { ComplaintStatus } from './enums/complaint-status.enum';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { ComplaintResponseDto } from './dto/complaint-response.dto';

@ApiTags('Complaints')
@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Manager)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  // ── UC29: List complaints at branch ────────────────────────────────────────

  @Get('branch/:branchId')
  @ApiOkResponse({ description: 'Complaints for the branch', type: [ComplaintResponseDto] })
  @ApiQuery({ name: 'status', enum: ComplaintStatus, required: false })
  async listByBranch(
    @Param('branchId') branchId: string,
    @Query('status') status: ComplaintStatus | undefined,
    @Request() req: any,
  ): Promise<ComplaintResponseDto[]> {
    const complaints = await this.complaintService.listByBranch(branchId, req.user.id, status);
    return plainToInstance(ComplaintResponseDto, complaints);
  }

  // ── UC29: View complaint detail ─────────────────────────────────────────────

  @Get(':id')
  @ApiOkResponse({ description: 'Complaint detail', type: ComplaintResponseDto })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.findOne(id, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  // ── UC29: Resolve complaint ─────────────────────────────────────────────────

  @Patch(':id/resolve')
  @ApiOkResponse({ description: 'Complaint resolved', type: ComplaintResponseDto })
  @ApiBadRequestResponse({ description: 'Complaint is not in a resolvable status' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async resolve(@Param('id') id: string, @Body() dto: ResolveComplaintDto, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.resolve(id, dto, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  // ── UC29: Reject complaint ──────────────────────────────────────────────────

  @Patch(':id/reject')
  @ApiOkResponse({ description: 'Complaint rejected', type: ComplaintResponseDto })
  @ApiBadRequestResponse({ description: 'Complaint is not in a rejectable status' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async reject(@Param('id') id: string, @Body() dto: ResolveComplaintDto, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.reject(id, dto, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }
}
