import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';
import { dbUtils } from '../../libs/database/utils';
import { ObjectId } from 'mongodb';
import { handleError } from './use-cases/handle-error';
import { generateOnlineActivity } from '../online-activity/usecase/create-online-activity';
import { emitMessageToParticipants } from './use-cases/emit-message-to-participate';

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
  _id: ObjectId;
  type: string;
}

interface ReadByDto {
  userId: ObjectId;
  type: string;
  timestamp: string;
}

interface Message {
  _id?: ObjectId;
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
  ) {}

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;
      const userIdObjectId = dbUtils.convertToObjectId(userId);
      const onlineActivity = generateOnlineActivity(
        this.onlineActivityCollection,
      );
      console.log('userId', userIdObjectId);
      await onlineActivity({
        userId: userIdObjectId,
        socketId: client.id,
      });

      console.log('User connected:', userId, 'Socket ID:', client.id);
    } catch (error) {
      handleError('Error during connection', error);
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
      handleError('Error during disconnection', error);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody()
    messageData: Message,
  ) {
    try {
      console.log(`Message received for chatRoomId: ${messageData.chatRoomId}`);
      await emitMessageToParticipants(
        messageData.chatRoomId,
        messageData,
        this.server,
      );
    } catch (error) {
      handleError('Error handling sendMessage event', error);
    }
  }
}
