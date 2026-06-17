import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertHealthRecordDto {
  @ApiProperty({ example: '1', description: 'Branch where this health record is managed' })
  @IsNotEmpty()
  @IsString()
  branchId!: string;

  @ApiPropertyOptional({ example: 'Da thường' })
  @IsOptional()
  @IsString()
  skinType?: string;

  @ApiPropertyOptional({ example: 'Dị ứng nhẹ với nước hoa tổng hợp' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ example: 'Không có bệnh lý đặc biệt' })
  @IsOptional()
  @IsString()
  medicalConditions?: string;

  @ApiPropertyOptional({ example: 'Không' })
  @IsOptional()
  @IsString()
  pregnancyStatus?: string;

  @ApiPropertyOptional({ example: 'Tránh dùng sản phẩm có cồn' })
  @IsOptional()
  @IsString()
  contraindications?: string;

  @ApiPropertyOptional({ example: 'Khách thích sản phẩm dịu nhẹ, không mùi mạnh.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
