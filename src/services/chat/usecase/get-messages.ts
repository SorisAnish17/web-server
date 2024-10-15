import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';

export const getMessages = (chatRoomsCollection: ChatEventCollection) => {
  return async (chatRoomId: string) => {
    try {
      const messages = await chatRoomsCollection.getMessages(chatRoomId);
      return messages;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to create staff',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};
