import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StrategyPriority, StrategyStatus } from '../entities/strategy.entity';

export class CreateStrategyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  badge!: string;

  @ApiPropertyOptional({ enum: StrategyPriority })
  @IsOptional()
  @IsEnum(StrategyPriority)
  priority?: StrategyPriority;

  @ApiPropertyOptional({ enum: StrategyStatus })
  @IsOptional()
  @IsEnum(StrategyStatus)
  status?: StrategyStatus;
}
