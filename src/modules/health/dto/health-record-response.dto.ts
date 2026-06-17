import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthRecordResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '42' })
  customerId!: string;

  @ApiPropertyOptional({ example: '1' })
  branchId!: string | null;

  @ApiPropertyOptional({ example: 'Da thường' })
  skinType!: string | null;

  @ApiPropertyOptional({ example: 'Dị ứng nhẹ với nước hoa tổng hợp' })
  allergies!: string | null;

  @ApiPropertyOptional({ example: 'Không có bệnh lý đặc biệt' })
  medicalConditions!: string | null;

  @ApiPropertyOptional({ example: 'Không' })
  pregnancyStatus!: string | null;

  @ApiPropertyOptional({ example: 'Tránh dùng sản phẩm có cồn' })
  contraindications!: string | null;

  @ApiPropertyOptional({ example: 'Khách thích sản phẩm dịu nhẹ, không mùi mạnh.' })
  notes!: string | null;

  @ApiProperty({ example: '7' })
  createdBy!: string;

  @ApiPropertyOptional({ example: '8' })
  updatedBy!: string | null;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  updatedAt!: Date;
}
