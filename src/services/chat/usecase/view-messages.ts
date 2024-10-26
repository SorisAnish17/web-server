import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';
import { dbUtils } from '../../../libs/database/utils';
import { ObjectId } from 'mongodb';

export const viewMessages = (chatRoomsCollection: ChatEventCollection) => {
  return async (userId: string, messageIds: ObjectId[]) => {
    try {
      const messageIdObjects = messageIds.map((id) =>
        dbUtils.convertToObjectId(id),
      ); // Convert to ObjectId
      const results = await chatRoomsCollection.viewMessagesByMessageIds(
        userId,
        messageIdObjects,
      );

      // Optionally handle errors for individual messages
      const failedMessages = results.filter((message) => !message.success);
      if (failedMessages.length > 0) {
        throw new HttpException(
          failedMessages.map((msg) => msg.message).join(', '),
          HttpStatus.NOT_FOUND,
        );
      }

      return results; // Return results for all messages
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Error viewing messages',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};
