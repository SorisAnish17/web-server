import { Socket } from 'socket.io';
import { OnlineActivityCollection } from '../../../libs/database/collections/online-activity/online-activity';
import { dbUtils } from '../../../libs/database/utils';
import { handleError } from './handle-error';
import { generateOnlineActivity } from '../../online-activity/usecase/create-online-activity';

export const handleConnection = (
  onlineActivityCollection: OnlineActivityCollection,
) => {
  return async (client: Socket) => {
    try {
      const userId = client.handshake.query.userId as string;
      const userIdObjectId = dbUtils.convertToObjectId(userId);
      const onlineActivity = generateOnlineActivity(onlineActivityCollection);

      await onlineActivity({
        userId: userIdObjectId,
        socketId: client.id,
      });

      console.log('User connected:', userId, 'Socket ID:', client.id);
    } catch (error) {
      handleError('Error during connection', error);
    }
  };
};
