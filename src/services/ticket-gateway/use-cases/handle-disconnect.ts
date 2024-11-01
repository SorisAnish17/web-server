import { Socket } from 'socket.io';
import { OnlineActivityCollection } from '../../../libs/database/collections/online-activity/online-activity';
import { handleError } from './handle-error';

export const handleDisconnect = (
  onlineActivityCollection: OnlineActivityCollection,
) => {
  return async (client: Socket) => {
    try {
      const userId = client.handshake.query.userId as string;
      console.log('User disconnected:', userId);

      await onlineActivityCollection.updateStatusByUserId(
        userId,
        client.id,
        'offline',
      );
    } catch (error) {
      handleError('Error during disconnection', error);
    }
  };
};
