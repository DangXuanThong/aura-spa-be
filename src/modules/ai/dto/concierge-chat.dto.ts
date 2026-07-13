import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ConciergeMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class ConciergeChatDto {
  @ApiProperty({ type: [ConciergeMessageDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ConciergeMessageDto)
  messages!: ConciergeMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;

  /** Explicit user confirmation to create booking (human-in-the-loop). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirmBooking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  bookingDraft?: {
    branchId: string;
    serviceId: string;
    startTime: string;
    technicianId?: string;
    notes?: string;
  };
}

export type UiActionDto = {
  type: 'deep_link' | 'quick_reply' | 'confirm_booking' | 'login' | 'escalate_human';
  label: string;
  href?: string;
  payload?: Record<string, unknown>;
};

export type ConciergeChatResponseDto = {
  assistantMessage: string;
  toolTrace: Array<{ name: string; ok: boolean; summary: string }>;
  uiActions: UiActionDto[];
  bookingDraft: {
    branchId: string;
    serviceId: string;
    startTime: string;
    technicianId?: string;
    notes?: string;
    branchName?: string;
    serviceName?: string;
    price?: number;
    durationMinutes?: number;
  } | null;
  bookingCreated: { id: string } | null;
  escalateToHuman: boolean;
  meta: {
    source: 'openai' | 'heuristic';
    disclaimer: string;
  };
};
