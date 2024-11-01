import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from '../../../libs/database/db-connections';
import { dbUtils } from '../../../libs/database/utils';
import { AgendaService } from '../../agenda/agenda.service';

export const removeUserFromScheduler = (
  agendaProvider: AgendaService,
  databaseClientService: DatabaseClientService,
) => {
  return async (
    userId: string,
    messageIds: { messageId: any; success: boolean; message: string }[],
  ) => {
    try {
      console.log('userId from removeUser scheduler', userId);
      console.log('response from removeUser From Scheduler', messageIds);
      const connectionDB = await databaseClientService.getDBCollection(
        dbCollectionNames.schedule_unread_messages,
      );
      const userObjectId = dbUtils.convertToObjectId(userId);

      // Create an array of find and delete operations
      const findPromises = messageIds.map((message) => {
        return connectionDB.findOne({
          userId: userObjectId,
          messageId: message.messageId,
        });
      });

      // Wait for all find operations to complete
      const foundUsers = await Promise.all(findPromises);

      // Create an array of operations to cancel jobs and delete entries
      const operations = foundUsers.map((findUser, index) => {
        if (findUser) {
          const messageId = messageIds[index].messageId;
          console.log(
            `Cancelling job for userId: ${userId} and messageId: ${messageId}`,
          );

          // Cancel the scheduled job for this user
          const cancelJob = agendaProvider.cancelJob(userId, messageId);

          // Remove their entry from the collection
          const deleteEntry = connectionDB.deleteOne({
            userId: userObjectId,
            messageId: messageId,
          });

          return Promise.all([cancelJob, deleteEntry]);
        }
        console.warn(
          `User not found in scheduler for messageId ${messageIds[index].messageId}.`,
        );
        return Promise.resolve(); // No operation if user not found
      });

      // Wait for all operations to complete
      await Promise.all(operations);

      return {
        success: true,
        message: 'All users removed from scheduler successfully.',
      };
    } catch (error) {
      console.error(
        'Error occurred while removing user from scheduler:',
        error,
      );
      return {
        success: false,
        message: 'An error occurred while processing your request.',
      };
    }
  };
};
