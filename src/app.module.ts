import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TicketGateway } from './ticket-gateway';
import { OnlineActivityModule } from './services/online-activity/online-activity.module';
import { ChatRoomsModule } from './services/chat-rooms/chat.rooms.module';
import { ChatEventModule } from './services/chat/chat.module';

@Module({
  imports: [OnlineActivityModule, ChatRoomsModule, ChatEventModule],
  controllers: [AppController],
  providers: [AppService, TicketGateway],
})
export class AppModule {}
