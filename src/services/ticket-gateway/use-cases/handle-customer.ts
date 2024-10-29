import { ObjectId } from 'mongodb';
import { getMessageById } from './get-chat-room-details';
import { getActiveUsersMap } from './get-active-users-map';
import { DatabaseClientService } from '../../../libs/database/index.service';

export const handleCustomer = async (
  messageId: ObjectId,
  organisationId: ObjectId,
) => {
  try {
    const databaseClientService = new DatabaseClientService();

    // Get active users
    const activeUsers = await getActiveUsersMap(databaseClientService);

    // Get message details
    const message = await getMessageById(messageId);

    // Check if the organisationId exists in the readBy array
    const hasRead = message.readBy.some((reader) =>
      reader.userId.equals(organisationId),
    );

    if (!hasRead) {
      console.log('online-users', activeUsers);

      const user = activeUsers.get(organisationId.toString());

      if (user) {
        const socketId = user.socketId;
        console.log(
          `Socket ID for organisation ${organisationId}: ${socketId}`,
        );

        // You can proceed to send a push notification or perform further actions using the socketId
      } else {
        console.log(`Organisation ${organisationId} is not active.`);
      }
    }
  } catch (error) {
    console.error('Error on sending push notification to customer', error);
  }
};
