import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { ComplaintResponseDto } from './dto/complaint-response.dto';

@ApiTags('Complaints')
@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  @Roles(UserRole.Customer)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Complaint submitted by customer', type: ComplaintResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid complaint payload' })
  @ApiForbiddenResponse({ description: 'Customer role required or booking does not belong to caller' })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  async create(@Body() dto: CreateComplaintDto, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.create(dto, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  @Get('my')
  @Roles(UserRole.Customer)
  @ApiOkResponse({ description: 'Complaints submitted by the authenticated customer', type: [ComplaintResponseDto] })
  @ApiForbiddenResponse({ description: 'Customer role required' })
  async findMine(@Request() req: any): Promise<ComplaintResponseDto[]> {
    const complaints = await this.complaintService.findMine(req.user.id);
    return plainToInstance(ComplaintResponseDto, complaints);
  }

  @Get('branch/:branchId')
  @Roles(UserRole.Manager)
  @ApiOkResponse({ description: 'Complaints for the branch', type: [ComplaintResponseDto] })
  @ApiQuery({ name: 'status', enum: ComplaintStatus, required: false })
  @ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
  async listByBranch(
    @Param('branchId') branchId: string,
    @Query('status') status: ComplaintStatus | undefined,
    @Request() req: any,
  ): Promise<ComplaintResponseDto[]> {
    const complaints = await this.complaintService.listByBranch(branchId, req.user.id, status);
    return plainToInstance(ComplaintResponseDto, complaints);
  }

  @Get(':id')
  @Roles(UserRole.Manager)
  @ApiOkResponse({ description: 'Complaint detail', type: ComplaintResponseDto })
  @ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.findOne(id, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  @Patch(':id/start-processing')
  @Roles(UserRole.Manager)
  @ApiOkResponse({ description: 'Complaint marked as in progress', type: ComplaintResponseDto })
  @ApiBadRequestResponse({ description: 'Complaint is not in an open status' })
  @ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async startProcessing(@Param('id') id: string, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.startProcessing(id, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.Manager)
  @ApiOkResponse({ description: 'Complaint resolved', type: ComplaintResponseDto })
  @ApiBadRequestResponse({ description: 'Complaint is not in a resolvable status' })
  @ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async resolve(@Param('id') id: string, @Body() dto: ResolveComplaintDto, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.resolve(id, dto, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }

  @Patch(':id/reject')
  @Roles(UserRole.Manager)
  @ApiOkResponse({ description: 'Complaint rejected', type: ComplaintResponseDto })
  @ApiBadRequestResponse({ description: 'Complaint is not in a rejectable status' })
  @ApiForbiddenResponse({ description: 'Manager role required or not assigned to this branch' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  async reject(@Param('id') id: string, @Body() dto: ResolveComplaintDto, @Request() req: any): Promise<ComplaintResponseDto> {
    const complaint = await this.complaintService.reject(id, dto, req.user.id);
    return plainToInstance(ComplaintResponseDto, complaint);
  }
}