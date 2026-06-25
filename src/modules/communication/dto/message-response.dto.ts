import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { SenderType } from '../enums/sender-type.enum';

export class MessageResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  conversationId!: string;

  @ApiPropertyOptional({ example: '7', description: 'null for guest messages' })
  senderUserId!: string | null;

  @ApiProperty({ enum: SenderType, enumName: 'SenderType', example: SenderType.Guest })
  senderType!: SenderType;

  @ApiProperty({ example: 'I would like to know more about your facial treatment packages.' })
  message!: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  attachments!: object[] | null;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  readAt!: Date | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: 'manager' })
  @Expose()
  @Transform(({ obj }) => obj.senderUser?.role || null)
  senderRole?: string | null;
}
