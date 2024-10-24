import { fetchChatRoom } from '../../chat/usecase/fetch-chat-room';
import { DatabaseClientService } from '../../../libs/database/index.service';

export const getChatRoomDetails = async (chatRoomId: string) => {
  const databaseClientService = new DatabaseClientService();
  try {
    const chatRoom = await fetchChatRoom(databaseClientService, chatRoomId);

    const merchantParticipants = chatRoom.participants.filter(
      (participant) => participant.type === 'merchant',
    );

    if (merchantParticipants.length > 0) {
      // Assuming the first merchant's details are sufficient
      const { organisationId, outletId } = merchantParticipants[0];
      return {
        organisationId,
        outletId,
      };
    }
    // Return null if there are no merchant participants
    return null;
  } catch (error) {
    console.error('Error fetching chat room details:', error);
    // Optionally throw the error or return a meaningful response
    throw new Error(
      'Unable to fetch chat room details. Please try again later.',
    );
  }
};
