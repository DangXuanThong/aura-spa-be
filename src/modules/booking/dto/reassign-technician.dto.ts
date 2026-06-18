import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReassignTechnicianDto {
  @ApiProperty({ example: '7', description: 'ID of the technician to assign' })
  @IsNotEmpty()
  @IsString()
  newTechnicianId!: string;
}
