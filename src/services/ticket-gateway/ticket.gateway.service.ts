import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { handleConnection } from './use-cases/handle-connection';
import { handleDisconnect } from './use-cases/handle-disconnect';
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class TicketGatewayServer
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private server: Server | null = null;

  private readonly handleConnectionFunc: (client: Socket) => Promise<void>;
  private readonly handleDisconnectFunc: (client: Socket) => Promise<void>;

  constructor(
    private readonly onlineActivityCollection: OnlineActivityCollection,
  ) {
    this.handleConnectionFunc = handleConnection(this.onlineActivityCollection);
    this.handleDisconnectFunc = handleDisconnect(this.onlineActivityCollection);
  }

  afterInit(server: Server) {
    this.server = server;
  }

  async getServer(): Promise<Server> {
    if (!this.server) {
      throw new Error('Server is not initialized yet.');
    }
    return this.server;
  }

  // Implement the WebSocket event handlers
  handleConnection(client: Socket) {
    return this.handleConnectionFunc(client);
  }

  handleDisconnect(client: Socket) {
    return this.handleDisconnectFunc(client);
  }
}
