import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  guestName?: string;

  @ApiPropertyOptional({ example: 'guest@example.com' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  guestPhone?: string;

  @ApiPropertyOptional({ example: '1', description: 'Branch to direct this inquiry to; omit for system-wide' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'Question about facial treatment packages' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  subject?: string;

  @ApiProperty({ example: 'I would like to know more about your facial treatment packages.' })
  @IsNotEmpty()
  @IsString()
  initialMessage!: string;
}
