import { Collection, ObjectId } from 'mongodb';
import { dbCollectionNames } from '../../../libs/database/db-connections';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { handleError } from './handle-error';
import { HttpStatus } from '@nestjs/common';

export async function fetchChatRoom(
  databaseClientService: DatabaseClientService,
  chatRoomId: string,
): Promise<any> {
  const chatRoomCollection: Collection =
    await databaseClientService.getDBCollection(dbCollectionNames.chat_rooms);
  const chatRoomIdObjectId = new ObjectId(chatRoomId);

  const filterRoom = await chatRoomCollection.findOne({
    referenceId: chatRoomIdObjectId,
  });

  if (!filterRoom) {
    handleError('Chat room not found', HttpStatus.NOT_FOUND);
  }

  return filterRoom;
}
