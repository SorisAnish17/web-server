import { ObjectId } from 'mongodb';
import { getMessageById } from './get-chat-room-details';

export const handleCustomer = async (
  messageId: ObjectId,
  organisationId: ObjectId,
) => {
  try {
    const message = await getMessageById(messageId);

    // Check if the organisationId exists in the readBy array
    const hasRead = message.readBy.some((reader) =>
      reader.userId.equals(organisationId),
    );

    if (hasRead) {
      console.log(
        `Customer with organisationId ${organisationId} has read the message.`,
      );
      // Handle the case where the message has been read
    } else {
      console.log(
        `Customer with organisationId ${organisationId} has not read the message.`,
      );
      // Handle the case where the message has not been read
    }
  } catch (error) {
    console.error('Error on send push notification to customer', error);
  }
};
