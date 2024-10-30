import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { sendMessage } from './usecase/send-message';
import { getMessages } from './usecase/get-messages';
import { viewMessages } from './usecase/view-messages';
import { DatabaseClientService } from '../../libs/database/index.service';
// import { TicketGatewayController } from '../ticket-gateway/ticket.gateway.controller';
import { TicketGatewayServer } from '../../services/ticket-gateway/ticket.gateway.service';
import { CreateChatMessageDto } from '../../core/dto/chat-event/index';
import { setSchedule } from '../schedule-unread-messages/usecase/set-scheduler'; // Import the setSchedule function
import { ScheduleUnreadMessagesCollection } from '../../libs/database/collections/schedule-unread-messages/schedule-unread-messages'; // Import the collection
import { AgendaProvider } from '../agenda/agenda.controller';
import { removeUserFromScheduler } from '../schedule-unread-messages/usecase/remove-user-from-scheduler';

@Injectable()
export class ChatEventService {
  readonly sendMessage: (messageData: any) => Promise<CreateChatMessageDto>;
  readonly getMessages = getMessages(this.chatEventCollection);
  readonly viewMessage = viewMessages(this.chatEventCollection);

  private scheduleUnreadMessages: (
    messageData: CreateChatMessageDto,
    messageId: ObjectId,
  ) => Promise<void>;

  constructor(
    private readonly chatEventCollection: ChatEventCollection,
    private readonly databaseClientService: DatabaseClientService,
    private readonly ticketGatewayController: TicketGatewayServer,
    private readonly scheduleUnreadMessagesCollection: ScheduleUnreadMessagesCollection,
    private readonly agendaProvider: AgendaProvider,
  ) {
    this.sendMessage = this.createSendMessage();
    this.viewMessage = this.createViewMessages();
    this.scheduleUnreadMessages = this.createSetSchedule();
  }

  private createSendMessage() {
    return async (messageData: any): Promise<CreateChatMessageDto> => {
      const server = await this.ticketGatewayController.getServer();

      const message = await sendMessage(
        this.chatEventCollection,
        this.databaseClientService,
        server,
      )(messageData);

      const messageId = message._id;
      await this.scheduleUnreadMessages(message, messageId);

      return message;
    };
  }
  private createViewMessages() {
    return async (userId: string, messageIds: ObjectId[]) => {
      const results = await viewMessages(this.chatEventCollection)(
        userId,
        messageIds,
      );

      for (const message of results) {
        if (message.success) {
          await this.removeUserScheduler(userId, message.messageId.toString());
        }
      }

      return results;
    };
  }

  public async removeUserScheduler(userId: string, messageId: string) {
    return removeUserFromScheduler(
      this.agendaProvider,
      this.databaseClientService,
    )(userId, messageId);
  }

  private createSetSchedule() {
    return setSchedule(
      this.databaseClientService,
      this.scheduleUnreadMessagesCollection,
      this.agendaProvider,
    );
  }
}
