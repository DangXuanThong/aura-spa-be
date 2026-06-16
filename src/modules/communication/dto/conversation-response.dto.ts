import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from '../enums/conversation-status.enum';

export class ConversationResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiPropertyOptional({ example: '42', description: 'Set when a registered customer initiates the conversation' })
  customerId!: string | null;

  @ApiPropertyOptional({ example: '1' })
  branchId!: string | null;

  @ApiPropertyOptional({ example: '7', description: 'Staff member assigned to handle this conversation' })
  assignedStaffId!: string | null;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  guestName!: string | null;

  @ApiPropertyOptional({ example: '0901234567' })
  guestPhone!: string | null;

  @ApiPropertyOptional({ example: 'guest@example.com' })
  guestEmail!: string | null;

  @ApiPropertyOptional({ example: 'Question about facial treatment packages' })
  subject!: string | null;

  @ApiProperty({ enum: ConversationStatus, enumName: 'ConversationStatus', example: ConversationStatus.Open })
  status!: ConversationStatus;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
