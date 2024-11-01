import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';
import { dbUtils } from '../../../libs/database/utils';
import { ObjectId } from 'mongodb';
import { ScheduleUnreadMessageService } from '../../schedule-unread-messages/schedule-unread.service';
import { ReadByDto } from '../../../core/dto/chat-event/index';

export const viewMessages = (
  chatRoomsCollection: ChatEventCollection,
  scheduleUnreadMessageService: ScheduleUnreadMessageService,
) => {
  return async (userId: string, messageIds: ObjectId[]) => {
    try {
      const results = [];
      const messageIdObjects = messageIds.map((id) =>
        dbUtils.convertToObjectId(id),
      );

      for (const messageIdObject of messageIdObjects) {
        const message = await chatRoomsCollection.findChatById(messageIdObject);

        if (!message) {
          results.push({
            messageId: messageIdObject,
            success: false,
            message: 'Message not found',
          });
          continue;
        }

        if (message.sender._id.toString() === userId) {
          results.push({
            messageId: messageIdObject,
            success: true,
            message: 'Sender does not need to view their own message',
          });
          continue;
        }

        const userObjectId = dbUtils.convertToObjectId(userId);

        if (
          message.readBy?.some((entry) => entry.userId.equals(userObjectId))
        ) {
          results.push({
            messageId: messageIdObject,
            success: true,
            message: 'Message already viewed',
          });
          continue;
        }

        const newReadByEntry: ReadByDto = {
          userId: userObjectId,
          type: 'viewer',
          timestamp: new Date().toISOString(),
        };

        // Update the message readBy
        const updateResponse = await chatRoomsCollection.updateMessageReadBy(
          messageIdObject,
          newReadByEntry,
        );

        results.push(updateResponse);

        // Remove user from unread messages if applicable
        await scheduleUnreadMessageService.removeUserFromUser(userId, results);
      }

      // Check for any failed updates
      const failedMessages = results.filter((msg) => !msg.success);
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
