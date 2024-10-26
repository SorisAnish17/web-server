import { fetchChatRoom } from './fetch-chat-room';
import { processParticipants } from './process-participants';
import { getActiveUsersMap } from './get-active-users-map';
import { getCustomerInfo } from './get-customer-info';
import { handleError } from './handle-error';
import { DatabaseClientService } from '../../../libs/database/index.service'; // Adjust the path as needed

export async function getParticipantsByChatRoomId(
  databaseClientService: DatabaseClientService,
  chatRoomId: string,
) {
  try {
    // Fetch the chat room based on the chatRoomId
    const filterRoom = await fetchChatRoom(databaseClientService, chatRoomId);

    // Get the active users map from the online activity collection
    const activeUsersMap = await getActiveUsersMap(databaseClientService);

    // Process the participants in the chat room and retrieve relevant details
    const { activeCustomerSocketId, organisationIds } =
      await processParticipants(
        filterRoom.participants,
        activeUsersMap,
        chatRoomId,
        databaseClientService,
      );

    // Fetch the customer information based on the organisation IDs
    if (organisationIds.length > 0 || activeCustomerSocketId) {
      const customersInfo = await getCustomerInfo(
        databaseClientService,
        organisationIds,
      );
      return {
        activeCustomerSocketId,
        customers: customersInfo,
      };
    }
  } catch (error) {
    // Handle any errors that occur
    handleError(error.message);
  }
}
