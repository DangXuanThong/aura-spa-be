import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Do you have any availability this weekend?' })
  @IsNotEmpty()
  @IsString()
  message!: string;
}
