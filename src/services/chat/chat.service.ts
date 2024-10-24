import { Injectable } from '@nestjs/common';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { sendMessage } from './usecase/send-message';
import { getMessages } from './usecase/get-messages';
import { viewMessages } from './usecase/view-messages';
import { DatabaseClientService } from '../../libs/database/index.service';

@Injectable()
export class ChatEventService {
  constructor(
    private readonly chatEventCollection: ChatEventCollection,
    private readonly databaseClientService: DatabaseClientService,
  ) {}

  readonly sendMessage = sendMessage(
    this.chatEventCollection,
    this.databaseClientService,
  );
  readonly getMessages = getMessages(this.chatEventCollection);
  readonly viewMessage = viewMessages(this.chatEventCollection);
}
