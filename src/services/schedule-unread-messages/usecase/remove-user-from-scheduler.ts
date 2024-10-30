import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from '../../../libs/database/db-connections';
import { dbUtils } from '../../../libs/database/utils';
import { AgendaProvider } from '../../agenda/agenda.controller';

export const removeUserFromScheduler = (
  agendaProvider: AgendaProvider,
  databaseClientService: DatabaseClientService,
) => {
  return async (userId: string, messageId: string) => {
    try {
      const connectionDB = await databaseClientService.getDBCollection(
        dbCollectionNames.schedule_unread_messages,
      );
      const userObjectId = dbUtils.convertToObjectId(userId);
      const messageObjectId = dbUtils.convertToObjectId(messageId);

      // Find the user entry in the scheduler
      const findUser = await connectionDB.findOne({
        userId: userObjectId,
        messageId: messageObjectId,
      });
      const find = await connectionDB.find({}).toArray();
      console.log('scheduler', find);
      console.log('find-user', findUser);
      console.log('userId', userObjectId);
      console.log('messageObjectId', messageObjectId);
      if (findUser) {
        console.log(
          `Cancelling job for userId: ${userId} and messageId: ${messageId}`,
        );

        // Cancel the scheduled job for this user
        await agendaProvider.cancelJob(userId, messageId); // Cancel the job using the userId

        // If the user is found, remove their entry from the collection
        const result = await connectionDB.deleteOne({
          userId: userObjectId,
          messageId: messageObjectId,
        });

        if (result.deletedCount > 0) {
          console.log(`User with ID ${userObjectId} removed from scheduler.`);
          return {
            success: true,
            message: 'User removed from scheduler successfully.',
          };
        } else {
          console.error('User removal failed, no documents deleted.');
          return {
            success: false,
            message: 'User removal failed.',
          };
        }
      } else {
        console.warn('User not found in scheduler.');
        return {
          success: false,
          message: 'User not found in scheduler.',
        };
      }
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
