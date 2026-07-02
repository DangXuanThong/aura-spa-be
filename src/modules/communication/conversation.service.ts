import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { StaffSchedule } from 'src/modules/schedule/entities/staff-schedule.entity';
import { ScheduleType } from 'src/modules/schedule/enums/schedule-type.enum';
import { ScheduleStatus } from 'src/modules/schedule/enums/schedule-status.enum';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from 'src/modules/user/entities/user.entity';
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
    @InjectRepository(StaffSchedule)
    private readonly staffScheduleRepo: Repository<StaffSchedule>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    private readonly dataSource: DataSource,
  ) {}

  // UC08 — Guest Submit Online Inquiry
  async createGuestConversation(dto: CreateConversationDto): Promise<{ conversation: Conversation; message: Message }> {
    let customerId: string | null = null;
    if (dto.guestEmail) {
      const existingUser = await this.messageRepo.manager.findOne(User, {
        where: { email: dto.guestEmail.trim().toLowerCase() },
      });
      if (existingUser) {
        customerId = existingUser.id;
      }
    }

    // A conversation with no opening message (or an orphaned message with no
    // conversation) would be unusable — create both rows atomically.
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
    });
  }

  async sendGuestMessage(conversationId: string, text: string): Promise<Message> {
    const conversation = await this.findOne(conversationId);

    return this.dataSource.transaction(async (manager) => {
      if (conversation.status === ConversationStatus.Closed) {
        conversation.status = ConversationStatus.Open;
        conversation.assignedStaffId = null;
        await manager.save(conversation);
      }
      return manager.save(
        manager.create(Message, {
          conversationId,
          senderType: SenderType.Guest,
          senderUserId: null,
          message: text,
          attachments: null,
        }),
      );
    });
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
        select: ['id'],
      });
      const isOnShift = !!shift;

      const staffBranch = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, status: StaffStatus.Active },
        select: ['branchId'],
      });
      if (isOnShift && staffBranch) {
        const staffBranchId = staffBranch.branchId;
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
      const mgrBranch = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, status: StaffStatus.Active },
        select: ['branchId'],
      });
      if (mgrBranch) {
        const mgrBranchId = mgrBranch.branchId;
        query.andWhere('(c.branchId = :mgrBranchId OR c.assignedStaffId = :requesterId)', {
          mgrBranchId,
          requesterId,
        });
      } else {
        query.andWhere('c.assignedStaffId = :requesterId', { requesterId });
      }
    }

    return query.orderBy('c.updatedAt', 'DESC').getMany();
  }

  async update(id: string, dto: UpdateConversationDto, requesterId: string, requesterRole: UserRole): Promise<Conversation> {
    const conversation = await this.findOne(id);
    this.assertCanHandleConversation(conversation, requesterId, requesterRole);

    if (!conversation.branchId && (requesterRole === UserRole.Staff || requesterRole === UserRole.Manager)) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, status: StaffStatus.Active },
        select: ['branchId'],
      });
      if (assignment) {
        conversation.branchId = assignment.branchId;
      }
    }

    if (requesterRole === UserRole.Staff && dto.assignedStaffId && dto.assignedStaffId !== requesterId) {
      if (dto.assignedStaffId === 'manager') {
        const managerAssignment = await this.branchStaffRepo.findOne({
          where: {
            branchId: conversation.branchId!,
            position: StaffPosition.Manager,
            status: StaffStatus.Active,
          },
          select: ['userId'],
        });
        if (managerAssignment) {
          dto.assignedStaffId = managerAssignment.userId;
          dto.status = ConversationStatus.Assigned;
        } else {
          conversation.assignedStaffId = null;
          dto.assignedStaffId = undefined;
          dto.status = ConversationStatus.Open;
        }
      } else {
        throw new ForbiddenException('Staff can only assign a conversation to themselves or to the branch manager');
      }
    }

    Object.assign(conversation, dto);
    return this.conversationRepo.save(conversation);
  }

  async sendStaffReply(conversationId: string, staffUserId: string, staffRole: UserRole, text: string): Promise<Message> {
    const conversation = await this.findOne(conversationId);
    this.assertCanHandleConversation(conversation, staffUserId, staffRole);

    const message = await this.dataSource.transaction(async (manager) => {
      if (conversation.status === ConversationStatus.Open) {
        conversation.status = ConversationStatus.Assigned;
        conversation.assignedStaffId = staffUserId;
        if (!conversation.branchId) {
          const assignment = await manager.getRepository(BranchStaff).findOne({
            where: { userId: staffUserId, status: StaffStatus.Active },
            select: ['branchId'],
          });
          if (assignment) {
            conversation.branchId = assignment.branchId;
          }
        }
        await manager.save(conversation);
      }

      return manager.save(
        manager.create(Message, {
          conversationId,
          senderType: SenderType.Staff,
          senderUserId: staffUserId,
          message: text,
          attachments: null,
        }),
      );
    });

    const staffUser = await this.messageRepo.manager.findOne(User, { where: { id: staffUserId } });
    if (staffUser) {
      message.senderUser = staffUser;
    }
    return message;
  }

  private assertCanHandleConversation(conversation: Conversation, requesterId: string, requesterRole: UserRole): void {
    if (requesterRole === UserRole.Owner) return;

    if (requesterRole === UserRole.Manager) return;

    if (conversation.status === ConversationStatus.Open) return;

    if (conversation.assignedStaffId === requesterId) return;

    throw new ForbiddenException('This conversation is already assigned to another staff member');
  }
}
