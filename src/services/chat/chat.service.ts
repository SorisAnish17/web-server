import { Injectable } from '@nestjs/common';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { getMessages } from './usecase/get-messages';
import { viewMessages } from './usecase/view-messages';
import { DatabaseClientService } from '../../libs/database/index.service';
import { TicketGatewayServer } from '../../services/ticket-gateway/ticket.gateway.service';
import { sendMessage } from './usecase/send-message';
import { ScheduleUnreadMessageService } from '../schedule-unread-messages/schedule-unread.service';

@Injectable()
export class ChatEventService {
  constructor(
    private readonly chatEventCollection: ChatEventCollection,
    private readonly databaseClientService: DatabaseClientService,
    private readonly ticketGatewayServer: TicketGatewayServer,
    private readonly scheduleUnreadMessageService: ScheduleUnreadMessageService,
  ) {}

  readonly sendMessage = sendMessage(
    this.chatEventCollection,
    this.databaseClientService,
    this.scheduleUnreadMessageService,
    this.ticketGatewayServer,
  );
  readonly getMessages = getMessages(this.chatEventCollection);
  readonly viewMessage = viewMessages(
    this.chatEventCollection,
    this.scheduleUnreadMessageService,
  );
}
