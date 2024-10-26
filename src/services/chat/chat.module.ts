import { Module, forwardRef } from '@nestjs/common';
import { ChatEventService } from './chat.service';
import { ChatEventsController } from './chat.controller';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { DatabaseClientModule } from '../../libs/database/index.module';
import { ScheduleUnreadMessagesCollection } from '../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';
import { AgendaModule } from '../agenda/agenda.module';
import { TicketGatewayModule } from '../ticket-gateway/ticket.gateway.module';
import { EmailClientModule } from '../../libs/email-delivery-client/email-delivery.module';

@Module({
  imports: [
    DatabaseClientModule,
    AgendaModule,
    forwardRef(() => TicketGatewayModule),
    EmailClientModule, // Ensure EmailClientModule is imported
  ],
  controllers: [ChatEventsController],
  providers: [
    ChatEventService,
    ChatEventCollection,
    ScheduleUnreadMessagesCollection,
  ],
  exports: [
    ChatEventService,
    ChatEventCollection,
    ScheduleUnreadMessagesCollection,
  ],
})
export class ChatEventModule {}
