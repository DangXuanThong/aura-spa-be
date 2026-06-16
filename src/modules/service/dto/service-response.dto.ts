import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceStatus } from '../enums/service-status.enum';

export class ServiceResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'SVC-FACIAL-001' })
  code!: string;

  @ApiProperty({ example: 'Chăm sóc da mặt cơ bản' })
  name!: string;

  @ApiProperty({ example: 'cham-soc-da-mat-co-ban' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Facial' })
  category!: string | null;

  @ApiPropertyOptional({ example: 'Làm sạch và dưỡng ẩm chuyên sâu cho da mặt.' })
  description!: string | null;

  @ApiProperty({ example: 60 })
  defaultDurationMinutes!: number;

  @ApiProperty({ example: 350000 })
  defaultPrice!: number;

  @ApiProperty({ enum: ServiceStatus, enumName: 'ServiceStatus', example: ServiceStatus.Active })
  status!: ServiceStatus;

  @ApiProperty({ example: false })
  isMultiSession!: boolean;

  @ApiPropertyOptional({ example: 5 })
  totalSessions!: number | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
