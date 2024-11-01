import Agenda from 'agenda';
import { ObjectId } from 'mongodb';

export const cancelJob = (agenda: Agenda) => {
  return async (userId: string, messageId: string) => {
    try {
      if (!ObjectId.isValid(userId) || !ObjectId.isValid(messageId)) {
        console.error('Invalid ObjectId format for userId or messageId');
        return;
      }
      const userIdObject = new ObjectId(userId);
      const messageIdObject = new ObjectId(messageId);

      const cancelledCount = await agenda.cancel({
        'data.userId': userIdObject,
        'data.messageId': messageIdObject,
      });

      console.log('Cancelled jobs count:', cancelledCount);
      if (cancelledCount > 0) {
        console.log(
          `Cancelled job for user ID: ${userId} and message ID: ${messageId}`,
        );
      } else {
        console.log(
          `No job found for user ID: ${userId} and message ID: ${messageId}`,
        );
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };
};
