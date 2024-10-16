import { Injectable } from '@nestjs/common';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { sendMessage } from './usecase/send-message';
import { getMessages } from './usecase/get-messages';
import { viewMessage } from './usecase/view-messages';

@Injectable()
export class ChatEventService {
  constructor(private readonly chatEventCollection: ChatEventCollection) {}

  readonly sendMessage = sendMessage(this.chatEventCollection);
  readonly getMessages = getMessages(this.chatEventCollection);
  readonly viewMessage = viewMessage(this.chatEventCollection);
}
