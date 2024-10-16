import { Module, forwardRef } from '@nestjs/common';
import { TicketGatewayController } from './ticket.gateway.controller';
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';
import { DatabaseClientModule } from '../../libs/database/index.module';
import { ChatEventModule } from '../chat/chat.module';
import { ChatEventCollection } from 'src/libs/database/collections/chat-event/chat-event';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [
    DatabaseClientModule,
    forwardRef(() => ChatEventModule),
    AgendaModule,
  ], // Add AgendaModule here
  providers: [
    TicketGatewayController,
    OnlineActivityCollection,
    ChatEventCollection,
  ],
  exports: [TicketGatewayController],
})
export class TicketGatewayModule {}
