import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: '42', description: 'ID of the completed booking being reviewed' })
  @IsNotEmpty()
  @IsString()
  bookingId!: string;

  @ApiPropertyOptional({ example: '5', description: 'Service ID for multi-service bookings. Omit for single-service bookings.' })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ example: 5, description: 'Rating from 1 (worst) to 5 (best)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Nhân viên rất tận tâm, da mình cải thiện rõ rệt!' })
  @IsOptional()
  @IsString()
  comment?: string;
}
