import { handleMerchantParticipant } from './handle-merchant-participant';
import { DatabaseClientService } from '../../../libs/database/index.service'; // Adjust the path as necessary

interface Participant {
  type: string;
  organisationId: string;
  outletId?: string; // Make outletId optional, as it is only required for merchants
}

export async function processParticipants(
  participants: Participant[], // Use the updated Participant type
  activeUsersMap: Map<string, { socketId: string }>,
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
) {
  const organisationIds: string[] = [];
  let activeCustomerSocketId: string | null = null;

  // Process each participant
  await Promise.all(
    participants.map(async (participant) => {
      try {
        if (participant.type === 'customer') {
          organisationIds.push(participant.organisationId);

          const onlineUser = activeUsersMap.get(
            participant.organisationId.toString(),
          );
          if (onlineUser) {
            activeCustomerSocketId = onlineUser.socketId;
          }
        } else if (participant.type === 'merchant' && participant.outletId) {
          // Call handleMerchantParticipant only when outletId is present
          await handleMerchantParticipant(
            {
              organisationId: participant.organisationId,
              outletId: participant.outletId,
            }, // Ensure both values are passed
            chatRoomId,
            databaseClientService,
          );
        }
      } catch (error) {
        console.error(`Error processing participant: ${error.message}`);
        // Optionally handle errors here, log, or rethrow
      }
    }),
  );

  // Return both active customer socket ID and organisation IDs
  return { activeCustomerSocketId, organisationIds };
}
