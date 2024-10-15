import { Body, Controller, Post, Get, Query } from '@nestjs/common';
import { ChatEventService } from './chat.service';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';
import { TicketGatewayController } from '../ticket-gateway/ticket.gateway.controller'; // Adjust import path

@Controller('chat-event')
export class ChatEventsController {
  constructor(
    private readonly chatRoomsService: ChatEventService,
    private readonly ticketGateway: TicketGatewayController, // Inject the TicketGateway
  ) {}

  @Post('send-message')
  async createOnlineActivity(@Body() messageData: CreateChatMessageDto) {
    const response = await this.chatRoomsService.sendMessage(
      messageData,
      this.ticketGateway.server,
    );
    const { messageId, message } = response;

    return { messageId, message };
  }

  @Get('/messages')
  async getMessages(@Query('chatRoomId') chatRoomId: string) {
    const messages = await this.chatRoomsService.getMessages(chatRoomId);
    return messages;
  }
}
