import { Injectable } from '@nestjs/common';
import { ChatRoomsCollection } from '../../libs/database/collections/chat-rooms/chat-rooms';
import { createChatRoom } from './use-case/create-chat-room';

@Injectable()
export class ChatRoomsService {
  constructor(private readonly chatRoomsCollection: ChatRoomsCollection) {}

  readonly createChatRoom = createChatRoom(this.chatRoomsCollection);
}