import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { TreatmentService } from './treatment.service';
import { TreatmentCourseResponseDto } from './dto/treatment-course-response.dto';
import { TreatmentSessionResponseDto } from './dto/treatment-session-response.dto';
import { UpdateTreatmentSessionProgressDto } from './dto/update-treatment-session-progress.dto';

@ApiTags('Treatment Courses')
@Controller('treatment-courses')
export class TreatmentController {
  constructor(private readonly treatmentService: TreatmentService) {}

  // ── Customer: treatment progress (UC16 — Track Treatment Progress) ──────────

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'All treatment courses for the authenticated customer with session progress', type: [TreatmentCourseResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required' })
  async findMyCourses(@Request() req: any): Promise<TreatmentCourseResponseDto[]> {
    const courses = await this.treatmentService.findMyCourses(req.user.id);
    return plainToInstance(TreatmentCourseResponseDto, courses);
  }

  @Get('branch/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff, UserRole.Manager, UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Treatment courses for a branch with ordered session progress', type: [TreatmentCourseResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff must be active at the branch or owner role required' })
  async findBranchCourses(
    @Param('branchId') branchId: string,
    @Request() req: any,
  ): Promise<TreatmentCourseResponseDto[]> {
    const courses = await this.treatmentService.findBranchCourses(branchId, req.user.id, req.user.role);
    return plainToInstance(TreatmentCourseResponseDto, courses);
  }

  @Patch('sessions/:sessionId/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Staff, UserRole.Manager, UserRole.Owner)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Treatment session progress updated by staff/manager/owner', type: TreatmentSessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Caller is not active at the treatment branch' })
  @ApiBadRequestResponse({ description: 'No progress field was provided' })
  async updateSessionProgress(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateTreatmentSessionProgressDto,
    @Request() req: any,
  ): Promise<TreatmentSessionResponseDto> {
    const session = await this.treatmentService.updateSessionProgress(sessionId, dto, req.user.id, req.user.role);
    return plainToInstance(TreatmentSessionResponseDto, session);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Customer)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Treatment course detail with all sessions ordered by session number', type: TreatmentCourseResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Customer role required or course does not belong to the caller' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<TreatmentCourseResponseDto> {
    const course = await this.treatmentService.findOneCourse(id, req.user.id);
    return plainToInstance(TreatmentCourseResponseDto, course);
  }
}
