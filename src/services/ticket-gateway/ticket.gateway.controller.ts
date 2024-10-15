import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';

enum BodyType {
  File = 'File',
  Text = 'Text',
}

enum MessageType {
  Event = 'Event',
  Message = 'Message',
}

interface BodyDto {
  type: BodyType;
  content: string;
}

interface SenderDto {
  _id: string;
  type: string;
}

interface ReadByDto {
  _id: string;
  type: string;
  timestamp: string;
}

interface Message {
  _id?: string;
  chatRoomId: string;
  type: MessageType;
  body: BodyDto;
  readBy: ReadByDto[];
  deleted: boolean;
  sender: SenderDto;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class TicketGatewayController
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly onlineActivityCollection: OnlineActivityCollection,
    private readonly chatEventCollection: ChatEventCollection,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;
      await this.onlineActivityCollection.generateOnlineActivity({
        userId,
        socketId: client.id,
      });
      console.log('User connected:', userId, 'Socket ID:', client.id);
    } catch (error) {
      this.handleError('Error during connection', error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;
      console.log('User disconnected:', userId);
      await this.onlineActivityCollection.updateStatusByUserId(
        userId,
        client.id,
        'offline',
      );
    } catch (error) {
      this.handleError('Error during disconnection', error);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(@MessageBody() messageData: Message) {
    try {
      console.log(`Message received for chatRoomId: ${messageData.chatRoomId}`);
      await this.chatEventCollection.sendMessage(messageData, this.server);
      await this.emitMessageToRoom(messageData.chatRoomId, messageData);
    } catch (error) {
      this.handleError('Error handling sendMessage event', error);
    }
  }

  // Emit the message only to participants of the specific chat room
  private async emitMessageToRoom(chatRoomId: string, message: Message) {
    try {
      const { activeCustomerSocketId, customers } =
        await this.chatEventCollection.getParticipantsByChatRoomId(
          chatRoomId,
          this.server,
        );

      this.emitToSocket(activeCustomerSocketId, 'newMessage', message);
      customers.forEach((customer) =>
        this.emitToSocket(customer.socketId, 'newMessage', message),
      );

      // Emit to assigned merchant staff based on roles or other logic
      const { organisationId, outletId } =
        await this.getChatRoomDetails(chatRoomId);
      const merchantStaffSocketIds =
        await this.chatEventCollection.getMerchantInfo(
          organisationId,
          outletId,
          chatRoomId,
          this.server,
        );

      merchantStaffSocketIds.forEach((socketId) =>
        this.emitToSocket(socketId, 'newMessage', message),
      );
    } catch (error) {
      this.handleError('Error emitting message to room participants', error);
    }
  }

  // Helper method to emit messages to a specific socket ID
  private emitToSocket(socketId: string, event: string, message: Message) {
    if (socketId) {
      console.log(`Emitting message to socketId: ${socketId}`);
      this.server.to(socketId).emit(event, message);
    }
  }

  // Helper method to fetch organisationId and outletId from chat room data
  private async getChatRoomDetails(
    chatRoomId: string,
  ): Promise<{ organisationId: string; outletId: string }> {
    const chatRoom = await this.chatEventCollection.fetchChatRoom(chatRoomId);
    return {
      organisationId: chatRoom.organisationId, // Assuming this field exists
      outletId: chatRoom.outletId, // Assuming this field exists
    };
  }

  // Centralized error handling method
  private handleError(message: string, error: any) {
    console.error(`${message}:`, error.message || error);
    throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
