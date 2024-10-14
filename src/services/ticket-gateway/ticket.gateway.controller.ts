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
    origin: '*', // For testing, allow all origins
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
    console.log('user diconnect', userId);
    await this.onlineActivityCollection.updateStatusByUserId(
      userId,
      client.id,
      'offline',
    );
  }

  @SubscribeMessage('joinTicket')
  async handleJoinTicket(
    @MessageBody() { chatRoomId }: { chatRoomId: string },
  ) {
    console.log('function emitting....');
    console.log('Received joinTicket with chatRoomId:', chatRoomId);
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
