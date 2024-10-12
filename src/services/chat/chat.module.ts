import { Module } from '@nestjs/common';
import { ChatEventService } from './chat.service';
import { ChatEventsController } from './chat.controller';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { DatabaseClientModule } from '../../libs/database/index.module';
import { TicketGatewayModule } from '../ticket-gateway/ticket.gateway.module';

@Module({
  imports: [DatabaseClientModule, TicketGatewayModule],
  controllers: [ChatEventsController],
  providers: [ChatEventService, ChatEventCollection],
  exports: [ChatEventService, ChatEventCollection],
})
export class ChatEventModule {}
