import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateComplaintDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty()
  @IsString()
  branchId!: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ example: 'KTV phục vụ không chu đáo' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Kỹ thuật viên đến muộn 20 phút và không xin lỗi.' })
  @IsNotEmpty()
  @IsString()
  description!: string;
}
