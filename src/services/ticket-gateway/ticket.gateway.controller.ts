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
import { ObjectId } from 'mongodb';

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
  async handleSendMessage(
    @MessageBody() messageId: ObjectId,
    messageData: Message,
  ) {
    try {
      console.log(`Message received for chatRoomId: ${messageData.chatRoomId}`);
      await this.emitMessageToParticipants(
        messageData.chatRoomId,
        messageData,
        messageId,
      );
    } catch (error) {
      this.handleError('Error handling sendMessage event', error);
    }
  }

  private async emitMessageToParticipants(
    chatRoomId: string,
    message: Message,
    messageId: ObjectId,
  ) {
    try {
      // Step 1: Get active customers and merchants
      const { activeCustomerSocketId, customers } =
        await this.chatEventCollection.getParticipantsByChatRoomId(chatRoomId);

      console.log('activeCustomerSocketId:', activeCustomerSocketId);

      // Step 2: Emit message to the active customer
      if (activeCustomerSocketId) {
        this.emitToSocket(
          activeCustomerSocketId,
          'newMessage',
          message,
          messageId,
        );
      }

      // Step 3: Emit message to all customers in the room
      customers.forEach((customer) => {
        this.emitToSocket(customer.socketId, 'newMessage', message, messageId);
      });

      // Step 4: Fetch organisationId and outletId from chatRoom details
      const { organisationId, outletId } =
        await this.getChatRoomDetails(chatRoomId);

      if (!organisationId || !outletId) {
        console.error(
          `Failed to retrieve organisationId or outletId for chatRoomId: ${chatRoomId}`,
        );
        return; // Stop execution if these are not available
      }

      // Step 5: Get merchant staff socket IDs (assigned or role-based)
      const merchantStaffSocketIds =
        await this.chatEventCollection.getMerchantInfo(
          organisationId,
          outletId,
          chatRoomId,
        );

      console.log('merchantStaffSocketIds:', merchantStaffSocketIds);

      // Step 6: Emit message to assigned merchant staff or role-based staff
      if (merchantStaffSocketIds && merchantStaffSocketIds.length > 0) {
        merchantStaffSocketIds.forEach((socketId) =>
          this.emitToSocket(socketId, 'newMessage', message, messageId),
        );
      } else {
        console.log(
          `No active merchant staff found for chatRoomId: ${chatRoomId}`,
        );
      }
      const adminSocketIds =
        await this.chatEventCollection.checkInternalAdminStaffs(chatRoomId);

      console.log('adminSocketIds:', adminSocketIds);

      // Step 8: Emit message to active admin staff
      if (adminSocketIds && adminSocketIds.length > 0) {
        adminSocketIds.forEach((socketId) =>
          this.emitToSocket(socketId, 'newMessage', message, messageId),
        );
      } else {
        console.log(
          `No active admin staff found for chatRoomId: ${chatRoomId}`,
        );
      }
    } catch (error) {
      // Centralized error handling
      this.handleError('Error emitting message to room participants', error);
    }
  }

  // Helper method to emit messages to a specific socket ID
  private emitToSocket(
    socketId: string,
    event: string,
    message: Message,
    messageId: ObjectId,
  ) {
    if (socketId) {
      console.log(`Emitting message to socketId: ${socketId}`);
      this.server.to(socketId).emit(event, message);
    }
  }

  // Helper method to fetch organisationId and outletId from chat room data
  private async getChatRoomDetails(
    chatRoomId: string,
  ): Promise<{ organisationId: string; outletId: string } | null> {
    const chatRoom = await this.chatEventCollection.fetchChatRoom(chatRoomId);

    const merchantParticipants = chatRoom.participants.filter(
      (participant) => participant.type === 'merchant',
    );

    if (merchantParticipants.length > 0) {
      // Assuming the first merchant's details are sufficient
      const { organisationId, outletId } = merchantParticipants[0];
      return {
        organisationId,
        outletId,
      };
    }

    // Return null if there are no merchant participants
    return null;
  }

  // Centralized error handling method
  private handleError(message: string, error: any) {
    console.error(`${message}:`, error.message || error);
    throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
