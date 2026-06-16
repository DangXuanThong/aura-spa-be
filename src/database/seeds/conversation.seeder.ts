import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from 'src/modules/communication/entities/conversation.entity';
import { Message } from 'src/modules/communication/entities/message.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { ConversationStatus } from 'src/modules/communication/enums/conversation-status.enum';
import { SenderType } from 'src/modules/communication/enums/sender-type.enum';
import { DEMO_CONVERSATIONS } from './seed-data';

@Injectable()
export class ConversationSeeder {
  private readonly logger = new Logger(ConversationSeeder.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.conversationRepo.count();
    if (count > 0) {
      this.logger.log('Conversations already exist — skipping');
      return;
    }

    const branches = await this.branchRepo.find();
    const branchByCode = new Map(branches.map((b) => [b.code, b]));

    const staffUsers = await this.userRepo.find();
    const staffByEmail = new Map(staffUsers.filter((u) => u.email !== null).map((u) => [u.email!, u]));

    let seeded = 0;
    for (const def of DEMO_CONVERSATIONS) {
      const branchId = def.branchCode ? (branchByCode.get(def.branchCode)?.id ?? null) : null;
      const hasReply = def.staffReply !== null;

      const conversation = await this.conversationRepo.save(
        this.conversationRepo.create({
          customerId: null,
          branchId,
          guestName: def.guestName,
          guestEmail: def.guestEmail,
          guestPhone: def.guestPhone,
          subject: def.subject,
          status: hasReply ? ConversationStatus.Assigned : ConversationStatus.Open,
          assignedStaffId: hasReply ? (staffByEmail.get(def.staffReply!.staffEmail)?.id ?? null) : null,
        }),
      );

      // guest's initial message
      await this.messageRepo.save(
        this.messageRepo.create({
          conversationId: conversation.id,
          senderType: SenderType.Guest,
          senderUserId: null,
          message: def.initialMessage,
          attachments: null,
        }),
      );

      // staff reply (if any)
      if (def.staffReply) {
        const staff = staffByEmail.get(def.staffReply.staffEmail);
        await this.messageRepo.save(
          this.messageRepo.create({
            conversationId: conversation.id,
            senderType: SenderType.Staff,
            senderUserId: staff?.id ?? null,
            message: def.staffReply.message,
            attachments: null,
          }),
        );
      }

      seeded++;
    }

    this.logger.log(`Seeded ${seeded} conversation(s)`);
  }
}
