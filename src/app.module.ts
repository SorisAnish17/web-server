import { Module } from '@nestjs/common';
import { TicketGatewayModule } from './services/ticket-gateway/ticket.gateway.module';
import { OnlineActivityModule } from './services/online-activity/online-activity.module';
import { ChatRoomsModule } from './services/chat-rooms/chat.rooms.module';
import { ChatEventModule } from './services/chat/chat.module';

@Module({
  imports: [
    OnlineActivityModule,
    ChatRoomsModule,
    ChatEventModule,
    TicketGatewayModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
