import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationStatus } from './enums/conversation-status.enum';
import { SenderType } from './enums/sender-type.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  // UC08 — Guest Submit Online Inquiry
  async createGuestConversation(dto: CreateConversationDto): Promise<{ conversation: Conversation; message: Message }> {
    const conversation = await this.conversationRepo.save(
      this.conversationRepo.create({
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        guestPhone: dto.guestPhone,
        branchId: dto.branchId ?? null,
        subject: dto.subject,
        status: ConversationStatus.Open,
      }),
    );

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: conversation.id,
        senderType: SenderType.Guest,
        senderUserId: null,
        message: dto.initialMessage,
        attachments: null,
      }),
    );

    return { conversation, message };
  }

  async findOne(id: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return conversation;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    await this.findOne(conversationId); // 404 if not found
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async sendGuestMessage(conversationId: string, text: string): Promise<Message> {
    await this.findOne(conversationId);
    return this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        senderType: SenderType.Guest,
        senderUserId: null,
        message: text,
        attachments: null,
      }),
    );
  }

  // Staff-facing routes
  async findAll(status?: ConversationStatus, branchId?: string, requesterId?: string, requesterRole?: UserRole): Promise<Conversation[]> {
    const query = this.conversationRepo.createQueryBuilder('c');

    if (status) {
      query.where('c.status = :status', { status });
    }

    if (branchId) {
      query.andWhere('c.branchId = :branchId', { branchId });
    }

    if (requesterRole === UserRole.Staff && requesterId) {
      query.andWhere('(c.status = :openStatus OR c.assignedStaffId = :requesterId)', {
        openStatus: ConversationStatus.Open,
        requesterId,
      });
    }

    return query.orderBy('c.updatedAt', 'DESC').getMany();
  }

  async update(id: string, dto: UpdateConversationDto, requesterId: string, requesterRole: UserRole): Promise<Conversation> {
    const conversation = await this.findOne(id);
    this.assertCanHandleConversation(conversation, requesterId, requesterRole);

    if (requesterRole === UserRole.Staff && dto.assignedStaffId && dto.assignedStaffId !== requesterId) {
      throw new ForbiddenException('Staff can only assign a conversation to themselves');
    }

    Object.assign(conversation, dto);
    return this.conversationRepo.save(conversation);
  }

  async sendStaffReply(conversationId: string, staffUserId: string, staffRole: UserRole, text: string): Promise<Message> {
    const conversation = await this.findOne(conversationId);
    this.assertCanHandleConversation(conversation, staffUserId, staffRole);

    if (conversation.status === ConversationStatus.Open) {
      conversation.status = ConversationStatus.Assigned;
      conversation.assignedStaffId = staffUserId;
      await this.conversationRepo.save(conversation);
    }

    return this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        senderType: SenderType.Staff,
        senderUserId: staffUserId,
        message: text,
        attachments: null,
      }),
    );
  }

  private assertCanHandleConversation(conversation: Conversation, requesterId: string, requesterRole: UserRole): void {
    if (requesterRole === UserRole.Owner) return;

    if (conversation.status === ConversationStatus.Open) return;

    if (conversation.assignedStaffId === requesterId) return;

    throw new ForbiddenException('This conversation is already assigned to another staff member');
  }
}
