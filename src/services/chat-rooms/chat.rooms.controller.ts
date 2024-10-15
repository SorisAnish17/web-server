import { Body, Controller, Post } from '@nestjs/common';
import { ChatRoomsService } from './chat.rooms.service';

@Controller('chat-rooms')
export class ChatRoomsController {
  constructor(private readonly chatRoomsService: ChatRoomsService) {}

  @Post()
  async createOnlineActivity(
    @Body() referenceInfo: { referenceId: string; referenceType: string },
  ) {
    return this.chatRoomsService.createChatRoom(referenceInfo);
  }
}
