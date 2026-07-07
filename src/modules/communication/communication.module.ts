import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Complaint } from './entities/complaint.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ConversationController } from './conversation.controller';
import { ComplaintController } from './complaint.controller';
import { ConversationService } from './conversation.service';
import { ComplaintService } from './complaint.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Complaint, Booking, BranchStaff]), AuthModule],
  controllers: [ConversationController, ComplaintController],
  providers: [ConversationService, ComplaintService, RolesGuard],
  exports: [ConversationService],
})
export class CommunicationModule {}
