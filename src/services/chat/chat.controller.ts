import { Body, Controller, Post } from '@nestjs/common';
import { ChatEventService } from './chat.service';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';

@Controller('chat-event')
export class ChatEventsController {
  constructor(private readonly chatRoomsService: ChatEventService) {}

  @Post('send-message')
  async createOnlineActivity(@Body() messageData: CreateChatMessageDto) {
    return this.chatRoomsService.createChatRoom(messageData);
  }
}
