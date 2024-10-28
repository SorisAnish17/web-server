import { ObjectId } from 'mongodb';
import { handleCustomer } from './handle-customer';
import { handleMerchant } from './handle-merchant'; // Ensure this import exists
import { getParticipants } from '../../chat/usecase/get-participant';
import { DatabaseClientService } from 'src/libs/database/index.service';

export const emitNotification = async (
  messageId: ObjectId,
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
) => {
  try {
    const participants = await getParticipants(
      databaseClientService,
      chatRoomId,
    );

    // Use Promise.all to handle async operations
    await Promise.all(
      participants.map(async (participant) => {
        if (participant.type === 'merchant') {
          await handleMerchant(
            messageId,
            chatRoomId,
            participant.organisationId,
            participant.outletId,
          );
        } else if (participant.type === 'customer') {
          await handleCustomer(messageId, participant.organisationId);
        }
      }),
    );
  } catch (error) {
    console.error('Error on emit notification', error);
    throw error; // Rethrow if necessary
  }
};
