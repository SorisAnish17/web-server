import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4000', 'http://localhost:5001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class TicketGatewayController
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private roomUsers: Map<string, Set<string>> = new Map();

  constructor(
    private readonly onlineActivityCollection: OnlineActivityCollection,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    await this.onlineActivityCollection.generateOnlineActivity({
      userId,
      socketId: client.id,
    });

    console.log('User connected:', userId, 'Socket ID:', client.id);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;

    await this.onlineActivityCollection.updateStatusByUserId(
      userId,
      client.id,
      'offline',
    );

    this.roomUsers.forEach((users, roomId) => {
      if (users.has(userId)) {
        users.delete(userId);
        if (users.size === 0) {
          this.roomUsers.delete(roomId);
        }
      }
    });

    console.log('User disconnected:', userId);
  }

  @SubscribeMessage('joinTicket')
  async handleJoinTicket(
    @MessageBody() { chatRoomId }: { chatRoomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('chatRoomId', chatRoomId);
    client.join(chatRoomId);

    const userId = client.handshake.query.userId as string;

    if (!this.roomUsers.has(chatRoomId)) {
      this.roomUsers.set(chatRoomId, new Set());
    }

    this.roomUsers.get(chatRoomId)?.add(userId);

    client.emit('joinedRoom', { chatRoomId });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody()
    { chatRoomId, message }: { chatRoomId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(chatRoomId).emit('newMessage', {
      userId: client.handshake.query.userId,
      message,
    });
  }
}
