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
import { OnlineActivityCollection } from './libs/database/collections/online-activity/online-activity';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class TicketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly onlineActivityCollection: OnlineActivityCollection,
  ) {}

  async handleConnection(client: Socket) {
    const { userId } = client.handshake.query;
    const socketId = client.id;
    const userIdString = Array.isArray(userId) ? userId[0] : userId;

    const onlineActivityMessage =
      await this.onlineActivityCollection.generateOnlineActivity({
        userId: userIdString,
        socketId,
      });

    console.log('User connected:', userIdString, 'Socket ID:', socketId);
    console.log(onlineActivityMessage);
  }

  async handleDisconnect(client: Socket) {
    const { userId } = client.handshake.query;
    const socketId = client.id;
    const userIdString = Array.isArray(userId) ? userId[0] : userId;

    const statusUpdateMessage =
      await this.onlineActivityCollection.updateStatusByUserId(
        userIdString,
        socketId,
        'offline',
      );

    console.log('socketId', socketId);
    console.log(statusUpdateMessage);
  }

  @SubscribeMessage('joinTicket')
  async handleJoinTicket(
    @MessageBody() ticketId: string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    client.emit('joinedRoom', { ticketId });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(): Promise<void> {}

  @SubscribeMessage('leaveTicket')
  handleLeaveTicket() {}
}
