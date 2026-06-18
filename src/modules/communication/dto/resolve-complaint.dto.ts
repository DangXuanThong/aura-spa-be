import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResolveComplaintDto {
  @ApiPropertyOptional({ example: 'We have spoken to the staff member and taken corrective action.' })
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
