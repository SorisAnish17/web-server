import { Module } from '@nestjs/common';
import { ChatRoomsService } from './chat.rooms.service';
import { ChatRoomsController } from './chat.rooms.controller';
import { ChatRoomsCollection } from '../../libs/database/collections/chat-rooms/chat-rooms';
import { DatabaseClientModule } from '../../libs/database/index.module';

@Module({
  imports: [DatabaseClientModule],
  controllers: [ChatRoomsController],
  providers: [ChatRoomsService, ChatRoomsCollection],
  exports: [ChatRoomsService, ChatRoomsCollection],
})
export class ChatRoomsModule {}
