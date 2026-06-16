import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), AuthModule],
  controllers: [ConversationController],
  providers: [ConversationService, RolesGuard],
  exports: [ConversationService],
})
export class CommunicationModule {}
