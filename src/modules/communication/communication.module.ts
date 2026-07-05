import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Complaint } from './entities/complaint.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ConversationController } from './conversation.controller';
import { ComplaintController } from './complaint.controller';
import { ConversationService } from './conversation.service';
import { ComplaintService } from './complaint.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Complaint, BranchStaff]),
    AuthModule,
    NotificationModule,
  ],
  controllers: [ConversationController, ComplaintController],
  providers: [ConversationService, ComplaintService, RolesGuard],
  exports: [ConversationService],
})
export class CommunicationModule {}
