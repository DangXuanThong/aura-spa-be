import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({ example: 'Cảm ơn bạn đã tin tưởng Aura Spa! Rất vui được phục vụ bạn.' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  replyText!: string;
}
