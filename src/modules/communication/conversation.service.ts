import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffSchedule } from 'src/modules/schedule/entities/staff-schedule.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationStatus } from './enums/conversation-status.enum';
import { SenderType } from './enums/sender-type.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';
import { ScheduleType } from 'src/modules/schedule/enums/schedule-type.enum';
import { ScheduleStatus } from 'src/modules/schedule/enums/schedule-status.enum';
import { AUTH_EVENTS } from 'src/common/constants/events';

// Sentinel sent by staff UI to escalate an open conversation to the branch manager
const ASSIGN_TO_MANAGER_SENTINEL = 'manager';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    @InjectRepository(StaffSchedule)
    private readonly staffScheduleRepo: Repository<StaffSchedule>,
    private readonly dataSource: DataSource,
  ) {}

  // UC08 — Guest Submit Online Inquiry
  async createGuestConversation(dto: CreateConversationDto): Promise<{ conversation: Conversation; message: Message }> {
    let customerId: string | null = null;
    if (dto.guestEmail) {
      const existingUser = await this.conversationRepo.manager.findOne(User, {
        where: { email: dto.guestEmail.trim().toLowerCase() },
      });
      if (existingUser) {
        customerId = existingUser.id;
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const conversation = await manager.save(
        manager.create(Conversation, {
          customerId,
          guestName: dto.guestName,
          guestEmail: dto.guestEmail,
          guestPhone: dto.guestPhone,
          branchId: dto.branchId ?? null,
          subject: dto.subject,
          status: ConversationStatus.Open,
        }),
      );

      const message = await manager.save(
        manager.create(Message, {
          conversationId: conversation.id,
          senderType: SenderType.Guest,
          senderUserId: null,
          message: dto.initialMessage,
          attachments: null,
        }),
      );

      return { conversation, message };
    });
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
      relations: ['senderUser'],
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }

  private assertGuestOwnership(conversation: Conversation, guestPhone: string | null, guestEmail: string | null): void {
    // Conversations with no guest identifiers are not accessible via unauthenticated routes
    if (!conversation.guestPhone && !conversation.guestEmail) {
      throw new ForbiddenException('Access denied');
    }
    const phoneMatch = !!(guestPhone && conversation.guestPhone === guestPhone);
    const emailMatch = !!(guestEmail && conversation.guestEmail?.toLowerCase() === guestEmail.toLowerCase());
    if (!phoneMatch && !emailMatch) {
      throw new ForbiddenException('Access denied');
    }
  }

  async findOneForGuest(id: string, guestPhone: string | null, guestEmail: string | null): Promise<Conversation> {
    const conversation = await this.findOne(id);
    this.assertGuestOwnership(conversation, guestPhone, guestEmail);
    return conversation;
  }

  async getMessagesForGuest(conversationId: string, guestPhone: string | null, guestEmail: string | null): Promise<Message[]> {
    const conversation = await this.findOne(conversationId);
    this.assertGuestOwnership(conversation, guestPhone, guestEmail);
    return this.messageRepo.find({
      where: { conversationId },
      relations: ['senderUser'],
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }

  async sendGuestMessage(conversationId: string, text: string, guestPhone: string | null, guestEmail: string | null): Promise<Message> {
    const conversation = await this.findOne(conversationId);
    this.assertGuestOwnership(conversation, guestPhone, guestEmail);
    if (conversation.status === ConversationStatus.Closed) {
      conversation.status = ConversationStatus.Open;
      conversation.assignedStaffId = null;
      await this.conversationRepo.save(conversation);
    }
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
      const now = new Date();
      const shift = await this.staffScheduleRepo.findOne({
        where: {
          staffId: requesterId,
          scheduleType: ScheduleType.Working,
          status: ScheduleStatus.Active,
          startTime: LessThanOrEqual(now),
          endTime: MoreThanOrEqual(now),
        },
      });
      const isOnShift = shift !== null;

      const bs = await this.branchStaffRepo.findOne({ where: { userId: requesterId, status: StaffStatus.Active } });
      if (isOnShift && bs) {
        const staffBranchId = bs.branchId;
        query.andWhere('(c.assignedStaffId = :requesterId OR (c.status = :openStatus AND c.branchId = :staffBranchId))', {
          openStatus: ConversationStatus.Open,
          requesterId,
          staffBranchId,
        });
      } else {
        query.andWhere('c.assignedStaffId = :requesterId', { requesterId });
      }
    }

    if (requesterRole === UserRole.Manager && requesterId) {
      const mgrAssignment = await this.branchStaffRepo.findOne({ where: { userId: requesterId, status: StaffStatus.Active } });
      if (mgrAssignment) {
        query.andWhere('(c.branchId = :mgrBranchId OR c.assignedStaffId = :requesterId)', {
          mgrBranchId: mgrAssignment.branchId,
          requesterId,
        });
      } else {
        query.andWhere('c.assignedStaffId = :requesterId', { requesterId });
      }
    }

    return query.orderBy('c.updatedAt', 'DESC').take(100).getMany();
  }

  async update(id: string, dto: UpdateConversationDto, requesterId: string, requesterRole: UserRole): Promise<Conversation> {
    const conversation = await this.findOne(id);
    await this.assertCanHandleConversation(conversation, requesterId, requesterRole);

    if (!conversation.branchId && (requesterRole === UserRole.Staff || requesterRole === UserRole.Manager)) {
      const assignment = await this.branchStaffRepo.findOne({ where: { userId: requesterId, status: StaffStatus.Active } });
      if (assignment) {
        conversation.branchId = assignment.branchId;
      }
    }

    let forceUnassign = false;
    if (requesterRole === UserRole.Staff && dto.assignedStaffId && dto.assignedStaffId !== requesterId) {
      if (dto.assignedStaffId === ASSIGN_TO_MANAGER_SENTINEL) {
        const managerAssignment = await this.branchStaffRepo.findOne({
          where: { branchId: conversation.branchId!, position: StaffPosition.Manager, status: StaffStatus.Active },
        });
        if (managerAssignment) {
          dto.assignedStaffId = managerAssignment.userId;
          dto.status = ConversationStatus.Assigned;
        } else {
          forceUnassign = true;
          dto.status = ConversationStatus.Open;
        }
      } else {
        throw new ForbiddenException('Staff can only assign a conversation to themselves or to the branch manager');
      }
    }

    Object.assign(conversation, dto);
    if (forceUnassign) {
      conversation.assignedStaffId = null;
    }
    return this.conversationRepo.save(conversation);
  }

  async sendStaffReply(conversationId: string, staffUserId: string, staffRole: UserRole, text: string): Promise<Message> {
    const conversation = await this.findOne(conversationId);
    await this.assertCanHandleConversation(conversation, staffUserId, staffRole);

    if (conversation.status === ConversationStatus.Open) {
      conversation.status = ConversationStatus.Assigned;
      conversation.assignedStaffId = staffUserId;
      if (!conversation.branchId) {
        const bs = await this.messageRepo.manager.query("SELECT branch_id FROM branch_staff WHERE user_id = $1 AND status = 'active' LIMIT 1", [
          staffUserId,
        ]);
        if (bs && bs.length > 0) {
          conversation.branchId = bs[0].branch_id;
        }
      }
      await this.conversationRepo.save(conversation);
    }

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId,
        senderType: SenderType.Staff,
        senderUserId: staffUserId,
        message: text,
        attachments: null,
      }),
    );

    const staffUser = await this.messageRepo.manager.findOne(User, { where: { id: staffUserId } });
    if (staffUser) {
      message.senderUser = staffUser;
    }
    return message;
  }

  private async assertCanHandleConversation(conversation: Conversation, requesterId: string, requesterRole: UserRole): Promise<void> {
    if (requesterRole === UserRole.Owner) return;

    if (requesterRole === UserRole.Manager) {
      // Manager may only handle conversations from their own branch
      if (conversation.branchId) {
        const bs = await this.conversationRepo.manager.query(
          "SELECT branch_id FROM branch_staff WHERE user_id = $1 AND status = 'active' LIMIT 1",
          [requesterId],
        );
        const mgrBranchId: string | undefined = bs?.[0]?.branch_id?.toString();
        if (mgrBranchId && mgrBranchId !== conversation.branchId.toString()) {
          throw new ForbiddenException('You can only manage conversations assigned to your branch');
        }
      }
      return;
    }

    if (conversation.status === ConversationStatus.Open) return;

    if (conversation.assignedStaffId === requesterId) return;

    throw new ForbiddenException('This conversation is already assigned to another staff member');
  }

  // BUG-130 — Link guest conversations to the newly registered user by email
  @OnEvent(AUTH_EVENTS.USER_REGISTERED)
  async linkGuestConversations(payload: { userId: string; email: string }): Promise<void> {
    await this.conversationRepo.update(
      { guestEmail: payload.email, customerId: IsNull() },
      { customerId: payload.userId },
    );
  }
}
