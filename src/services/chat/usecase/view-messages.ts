import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';

export const viewMessage = (chatRoomsCollection: ChatEventCollection) => {
  return async (userId: string, messageId: string) => {
    try {
      const messages = await chatRoomsCollection.viewMessage(userId, messageId);
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
