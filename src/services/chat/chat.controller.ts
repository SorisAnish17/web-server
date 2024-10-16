import { Body, Controller, Post, Get, Query, Put } from '@nestjs/common';
import { ChatEventService } from './chat.service';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';
import { TicketGatewayController } from '../ticket-gateway/ticket.gateway.controller';

@Controller('chat-event')
export class ChatEventsController {
  constructor(
    private readonly chatRoomsService: ChatEventService,
    private readonly ticketGatewayController: TicketGatewayController, // Inject the WebSocket gateway controller
  ) {}

  @Post('send-message')
  async createOnlineActivity(@Body() messageData: CreateChatMessageDto) {
    // Send the message using the chat service
    const response = await this.chatRoomsService.sendMessage(messageData);
    const { messageId, message } = response;

    // Emit the message to the participants using WebSocket
    await this.ticketGatewayController.handleSendMessage(messageId, message);

    return { messageId, message };
  }

  @Get('/messages')
  async getMessages(@Query('chatRoomId') chatRoomId: string) {
    const messages = await this.chatRoomsService.getMessages(chatRoomId);
    return messages;
  }

  @Put('/message/view')
  async viewMessage(
    @Body('userId') userId: string,
    @Body('messageId') messageId: string,
  ) {
    const result = await this.chatRoomsService.viewMessage(userId, messageId);
    return result;
  }
}
