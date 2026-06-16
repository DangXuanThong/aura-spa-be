import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ConversationStatus } from '../enums/conversation-status.enum';

export class UpdateConversationDto {
  @ApiPropertyOptional({ enum: ConversationStatus, enumName: 'ConversationStatus' })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ example: '7', description: 'Staff user ID to assign this conversation to' })
  @IsOptional()
  @IsString()
  assignedStaffId?: string;
}
