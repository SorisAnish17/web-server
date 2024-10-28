import { fetchChatRoom } from '../../chat/usecase/fetch-chat-room';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from 'src/libs/database/db-connections';
import { ObjectId } from 'mongodb';

const databaseClientService = new DatabaseClientService();

export const getChatRoomDetails = async (chatRoomId: string) => {
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

export const getMessageById = async (messageId: ObjectId) => {
  try {
    const connectionDB = await databaseClientService.getDBCollection(
      dbCollectionNames.chat_events,
    );

    const getMessageById = connectionDB.findOne({ _id: messageId });

    return getMessageById;
  } catch (error) {
    console.error('Error fetching message details', error);
  }
};
