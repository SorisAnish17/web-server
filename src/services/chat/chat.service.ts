import { Injectable } from '@nestjs/common';
import { ChatEventCollection } from '../../libs/database/collections/chat-event/chat-event';
import { sendMessage } from './usecase/send-message';

@Injectable()
export class ChatEventService {
  constructor(private readonly chatEventCollection: ChatEventCollection) {}

  readonly createChatRoom = sendMessage(this.chatEventCollection);
}
