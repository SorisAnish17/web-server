import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatRoomsCollection } from '../../../libs/database/collections/chat-rooms/chat-rooms';

export const getChatRoom = (chatRoomsCollection: ChatRoomsCollection) => {
  return async (referenceId: string) => {
    try {
      const response =
        await chatRoomsCollection.getChatRoomByReferenceId(referenceId);
      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to create chat-room',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};
