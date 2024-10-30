import { Module } from '@nestjs/common';
// import { TicketGatewayController } from './ticket.gateway.controller';
import { TicketGatewayServer } from './ticket.gateway.service';
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';
import { DatabaseClientModule } from '../../libs/database/index.module';
import { ChatEventCollection } from 'src/libs/database/collections/chat-event/chat-event';
import { ScheduleUnreadMessagesCollection } from 'src/libs/database/collections/schedule-unread-messages/schedule-unread-messages';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [DatabaseClientModule, AgendaModule], // Add AgendaModule here
  providers: [
    ScheduleUnreadMessagesCollection,
    OnlineActivityCollection,
    ChatEventCollection,
    TicketGatewayServer,
  ],
  exports: [TicketGatewayServer],
})
export class TicketGatewayModule {}
