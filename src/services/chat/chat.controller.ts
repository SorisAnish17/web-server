import { Body, Controller, Post } from '@nestjs/common';
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
    // Pass the WebSocket server to the service method
    const message = await this.chatRoomsService.createChatRoom(
      messageData,
      this.ticketGateway.server, // Pass the server here
    );

    // Emit the message to all connected clients
    this.ticketGateway.server.emit('newMessage', message); // Emit the message to clients

    return { message };
  }
}
