import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { ChatRoomsService } from './chat.rooms.service';

@Controller('chat-rooms')
export class ChatRoomsController {
  constructor(private readonly chatRoomsService: ChatRoomsService) {}

  @Post('create')
  async createOnlineActivity(
    @Body() referenceInfo: { referenceId: string; referenceType: string },
  ) {
    return this.chatRoomsService.createChatRoom(referenceInfo);
  }

  @Get('/get-chat-room/:referenceId')
  async getChatRoom(@Param('referenceId') referenceId: string) {
    console.log('referenceId', referenceId);
    return this.chatRoomsService.getChatRoom(referenceId);
  }
}
