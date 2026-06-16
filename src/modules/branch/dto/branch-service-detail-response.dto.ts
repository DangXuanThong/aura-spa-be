import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ServiceResponseDto } from 'src/modules/service/dto/service-response.dto';

export class BranchServiceDetailResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: '1' })
  serviceId!: string;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({ example: 90, description: 'Effective duration: branch override if set, else service default' })
  effectiveDurationMinutes!: number;

  @ApiProperty({ example: 450000, description: 'Effective price: branch override if set, else service default' })
  effectivePrice!: number;

  @ApiPropertyOptional({ example: 3 })
  maxParallelBookings!: number | null;

  @ApiProperty({ type: () => ServiceResponseDto })
  @Type(() => ServiceResponseDto)
  service!: ServiceResponseDto;
}
