import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Do you have any availability this weekend?' })
  @IsNotEmpty()
  @IsString()
  message!: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Guest phone used to verify ownership of this conversation' })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiPropertyOptional({ example: 'guest@example.com', description: 'Guest email used to verify ownership of this conversation' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;
}
