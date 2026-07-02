import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationStatus } from './enums/conversation-status.enum';

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  // ── Public: guest inquiry routes (UC08 — Submit Online Inquiry) ──────────

  @Post()
  @ApiCreatedResponse({ description: 'Conversation started; save the returned ID to track replies', type: ConversationResponseDto })
  async create(@Body() dto: CreateConversationDto): Promise<ConversationResponseDto> {
    const { conversation } = await this.conversationService.createGuestConversation(dto);
    return plainToInstance(ConversationResponseDto, conversation);
  }

  @Get('public/:id')
  @ApiOkResponse({ description: 'Public conversation detail for guest chat', type: ConversationResponseDto })
  async findPublicOne(@Param('id') id: string): Promise<ConversationResponseDto> {
    const result = await this.conversationService.findOne(id);
    return plainToInstance(ConversationResponseDto, result);
  }

  @Get('public/:id/messages')
  @ApiOkResponse({ description: 'Public messages in a guest conversation ordered oldest-first', type: [MessageResponseDto] })
  async getPublicMessages(@Param('id') id: string): Promise<MessageResponseDto[]> {
    const messages = await this.conversationService.getMessages(id);
    return plainToInstance(MessageResponseDto, messages);
  }

  @Post('public/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Public guest message sent', type: MessageResponseDto })
  async sendPublicMessage(@Param('id') id: string, @Body() dto: SendMessageDto): Promise<MessageResponseDto> {
    const message = await this.conversationService.sendGuestMessage(id, dto.message);
    return plainToInstance(MessageResponseDto, message);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Conversation detail', type: ConversationResponseDto })
  async findOne(@Param('id') id: string): Promise<ConversationResponseDto> {
    const result = await this.conversationService.findOne(id);
    return plainToInstance(ConversationResponseDto, result);
  }

  @Get(':id/messages')
  @ApiOkResponse({ description: 'Messages in the conversation ordered oldest-first', type: [MessageResponseDto] })
  async getMessages(@Param('id') id: string): Promise<MessageResponseDto[]> {
    const messages = await this.conversationService.getMessages(id);
    return plainToInstance(MessageResponseDto, messages);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Guest message sent', type: MessageResponseDto })
  async sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto): Promise<MessageResponseDto> {
    const message = await this.conversationService.sendGuestMessage(id, dto.message);
    return plainToInstance(MessageResponseDto, message);
  }

  // ── Staff/Owner: inbox management routes ────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'List of conversations', type: [ConversationResponseDto] })
  @ApiQuery({ name: 'status', enum: ConversationStatus, enumName: 'ConversationStatus', required: false })
  @ApiQuery({ name: 'branchId', type: String, required: false })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff or Owner role required' })
  async findAll(@Request() req: any, @Query('status') status?: ConversationStatus, @Query('branchId') branchId?: string): Promise<ConversationResponseDto[]> {
    const results = await this.conversationService.findAll(status, branchId, req.user.id, req.user.role);
    return plainToInstance(ConversationResponseDto, results);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Staff)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Conversation updated', type: ConversationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff or Owner role required' })
  async update(@Param('id') id: string, @Body() dto: UpdateConversationDto, @Request() req: any): Promise<ConversationResponseDto> {
    const result = await this.conversationService.update(id, dto, req.user.id, req.user.role);
    return plainToInstance(ConversationResponseDto, result);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Owner, UserRole.Manager, UserRole.Staff)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Staff reply sent; auto-assigns conversation if still Open', type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Staff or Owner role required' })
  async reply(@Param('id') id: string, @Body() dto: SendMessageDto, @Request() req: any): Promise<MessageResponseDto> {
    const message = await this.conversationService.sendStaffReply(id, req.user.id, req.user.role, dto.message);
    return plainToInstance(MessageResponseDto, message);
  }
}
