import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';

export const sendMessage = (chatRoomsCollection: ChatEventCollection) => {
  return async (
    messageData: CreateChatMessageDto,
  ): Promise<CreateChatMessageDto> => {
    try {
      const message = await chatRoomsCollection.sendMessage(messageData);

      return message;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to create message',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};
