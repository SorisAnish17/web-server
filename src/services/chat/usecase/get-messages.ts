import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';

export const getMessages = (chatRoomsCollection: ChatEventCollection) => {
  return async (chatRoomId: string, filterOptions: { pageNo: number }) => {
    try {
      const messages = await chatRoomsCollection.getMessagesByChatRoomId(
        chatRoomId,
        filterOptions,
      );
      return messages;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to get messages',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};
