import { DatabaseClientService } from '../../../libs/database/index.service';
import { ObjectId } from 'mongodb';
import { dbCollectionNames } from 'src/libs/database/db-connections';

export const getChatRoomParticipate = async (
  chatRoomIdObjectId: ObjectId,
  databaseClientServcie: DatabaseClientService,
) => {
  const chatRoomCollection = await databaseClientServcie.getDBCollection(
    dbCollectionNames.chat_rooms,
  );
  const chatRoom = await chatRoomCollection.findOne({
    referenceId: chatRoomIdObjectId,
  });
  const { participants } = chatRoom;

  return { participants, chatRoom };
};
