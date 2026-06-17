import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { TreatmentService } from './treatment.service';
import { TreatmentCourseResponseDto } from './dto/treatment-course-response.dto';

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
