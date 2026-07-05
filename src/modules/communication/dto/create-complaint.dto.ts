import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateComplaintDto {
  @ApiPropertyOptional({ example: '42', description: 'Booking being complained about. If omitted, branchId is required.' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ example: '7', description: 'Branch receiving this complaint. Required when bookingId is omitted.' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'Không hài lòng về trải nghiệm dịch vụ' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Mình đã đặt lịch massage nhưng thời gian chờ quá lâu và nhân viên chưa giải thích rõ.' })
  @IsNotEmpty()
  @IsString()
  description!: string;
}
