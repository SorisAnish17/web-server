import { Module } from '@nestjs/common';
import { ChatEventService } from './chat.service';
import { ChatEventsController } from './chat.controller';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { DatabaseClientModule } from '../../libs/database/index.module';

@Module({
  imports: [DatabaseClientModule],
  controllers: [ChatEventsController],
  providers: [ChatEventService, ChatEventCollection],
  exports: [ChatEventService, ChatEventCollection],
})
export class ChatEventModule {}
