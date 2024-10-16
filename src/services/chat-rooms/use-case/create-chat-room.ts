import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatRoomsCollection } from '../../../libs/database/collections/chat-rooms/chat-rooms';

export const createChatRoom = (chatRoomsCollection: ChatRoomsCollection) => {
  return async (referenceInfo: { referenceId: string; referenceType }) => {
    try {
      const message = await chatRoomsCollection.createChatRoom(referenceInfo);

      return { message: message };
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
