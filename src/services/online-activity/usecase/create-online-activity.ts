import { HttpException, HttpStatus } from '@nestjs/common';
import { OnlineActivityDto } from '../../../core/dto/online-activity/index';
import { OnlineActivityCollection } from '../../../libs/database/collections/online-activity/online-activity';
import { dbUtils } from '../../../libs/database/utils';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from 'src/libs/database/db-connections';
import { ClientSession, ObjectId } from 'mongodb';

const databaseClientServiceInstance = new DatabaseClientService();

export const generateOnlineActivity = (
  onlineActivityCollection: OnlineActivityCollection,
) => {
  return async (socketConnection: OnlineActivityDto) => {
    try {
      const { userId } = socketConnection;

      const userExists = await doesUserIdExist(
        userId,
        databaseClientServiceInstance,
      );

      if (userExists) {
        await onlineActivityCollection.updateStatusByUserId(
          userId.toString(),
          socketConnection.socketId,
          'online',
        );
      } else {
        const activityToInsert = {
          ...socketConnection,
          userId,
          status: 'online',
          ...dbUtils.createdTimestamp(),
        };
        const insertedActivityMessage =
          await onlineActivityCollection.createOnlineActivity(activityToInsert);
        return { message: insertedActivityMessage };
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to create online activity',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};

const doesUserIdExist = async (
  userId: ObjectId,
  databaseClientService: DatabaseClientService,
  session?: ClientSession,
) => {
  const connectionDB = await databaseClientService.getDBCollection(
    dbCollectionNames.online_activity,
  );
  const user = await connectionDB.findOne({ userId }, { session });
  return !!user;
};
