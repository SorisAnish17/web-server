// chat.module.ts
import { Module } from '@nestjs/common';
import { ChatEventService } from './chat.service';
import { ChatEventsController } from './chat.controller';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { DatabaseClientModule } from '../../libs/database/index.module';
import { TicketGatewayModule } from '../ticket-gateway/ticket.gateway.module';
import { ScheduleUnreadMessagesCollection } from '../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';
import { AgendaModule } from '../agenda/agenda.module'; // Adjust the path as needed

@Module({
  imports: [DatabaseClientModule, TicketGatewayModule, AgendaModule], // Include AgendaModule
  controllers: [ChatEventsController],
  providers: [
    ChatEventService,
    ChatEventCollection,
    ScheduleUnreadMessagesCollection,
  ],
  exports: [ChatEventService, ChatEventCollection],
})
export class ChatEventModule {}
