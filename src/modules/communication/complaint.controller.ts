import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
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
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ComplaintResponseDto } from './dto/complaint-response.dto';

@ApiTags('Complaints')
@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  // ── Customer: Create new complaint ──────────────────────────────────────────

  @Post()
  @Roles(UserRole.Customer)
  @ApiOkResponse({ description: 'Complaint created successfully', type: ComplaintResponseDto })
  async create(@Body() dto: CreateComplaintDto, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.create(dto, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  // ── Customer: List my complaints ───────────────────────────────────────────

  @Get('customer/my')
  @Roles(UserRole.Customer)
  @ApiOkResponse({ description: 'My complaints', type: [ComplaintResponseDto] })
  async listMyComplaints(@Request() req: any): Promise<ComplaintResponseDto[]> {
    const complaints = await this.complaintService.listByCustomer(req.user.id);
    return plainToInstance(ComplaintResponseDto, complaints);
  }

  // ── Manager: List complaints at branch ────────────────────────────────────────

  @Get('branch/:branchId')
  @Roles(UserRole.Manager)
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

  // ── Manager/Customer: View complaint detail ─────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.Manager, UserRole.Customer)
  @ApiOkResponse({ description: 'Complaint detail', type: ComplaintResponseDto })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.findOne(id, req.user.id, req.user.role);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  // ── Manager: Resolve complaint ─────────────────────────────────────────────────

  @Patch(':id/resolve')
  @Roles(UserRole.Manager)
  @ApiOkResponse({ description: 'Complaint resolved', type: ComplaintResponseDto })
  @ApiBadRequestResponse({ description: 'Complaint is not in a resolvable status' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async resolve(@Param('id') id: string, @Body() dto: ResolveComplaintDto, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.resolve(id, dto, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  // ── Manager: Reject complaint ──────────────────────────────────────────────────

  @Patch(':id/reject')
  @Roles(UserRole.Manager)
  @ApiOkResponse({ description: 'Complaint rejected', type: ComplaintResponseDto })
  @ApiBadRequestResponse({ description: 'Complaint is not in a rejectable status' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async reject(@Param('id') id: string, @Body() dto: ResolveComplaintDto, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.reject(id, dto, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }
}
