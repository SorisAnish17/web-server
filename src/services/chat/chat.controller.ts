import { Body, Controller, Post, Get, Query, Put } from '@nestjs/common';
import { ChatEventService } from './chat.service';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';
import { dbUtils } from '../../libs/database/utils';

@Controller('chat-event')
export class ChatEventsController {
  constructor(private readonly chatRoomsService: ChatEventService) {}

  @Post('send-message')
  async createOnlineActivity(@Body() messageData: CreateChatMessageDto) {
    // Send the message using the chat service
    const message = await this.chatRoomsService.sendMessage(messageData); // Directly get the message

    return { message }; // Return the sent message
  }

  @Get('/messages')
  async getMessages(
    @Query('chatRoomId') chatRoomId: string,
    @Query('pageNo') pageNo: number = 1,
  ) {
    const sanitizedPage = Math.max(pageNo, 1);

    const messages = await this.chatRoomsService.getMessages(chatRoomId, {
      pageNo: sanitizedPage,
    });
    return messages;
  }

  @Put('/messages/view') // Adjust endpoint to indicate handling multiple messages
  async viewMessages(
    @Body('userId') userId: string,
    @Body('messageIds') messageIds: string[], // Accept array of message IDs
  ) {
    const messageIdObjects = messageIds.map((id) =>
      dbUtils.convertToObjectId(id),
    );
    const results = await this.chatRoomsService.viewMessage(
      userId,
      messageIdObjects,
    );
    return results; // Return all results
  }
}
