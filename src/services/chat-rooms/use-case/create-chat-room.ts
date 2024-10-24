import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatRoomsCollection } from '../../../libs/database/collections/chat-rooms/chat-rooms';
import { dbUtils } from '../../../libs/database/utils';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from 'src/libs/database/db-connections';
import { ObjectId } from 'mongodb';

interface Participant {
  organisationId: string;
  outletId?: string;
  type: string;
}

interface ReferenceInfo {
  referenceId: string;
  referenceType: string;
}

const databaseClientServiceInstance = new DatabaseClientService();

export const createChatRoom = (chatRoomsCollection: ChatRoomsCollection) => {
  return async (referenceInfo: { referenceId: string; referenceType }) => {
    try {
      const { referenceId, referenceType } = referenceInfo;

      const referenceObjectId = dbUtils.convertToObjectId(referenceId);

      const existingChatRoom = await findChatRoom(
        referenceObjectId,
        referenceType,
      );
      if (existingChatRoom) {
        throw new HttpException(
          'Chat room already exists',
          HttpStatus.BAD_REQUEST,
        );
      } else {
        const response = await filterTicket(referenceInfo);
        const message = await chatRoomsCollection.createChatRoom(response);

        return { message: message };
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to create chat-room',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};

const findChatRoom = async (
  referenceObjectId: ObjectId,
  referenceType: string,
) => {
  const connectionDB = await databaseClientServiceInstance.getDBCollection(
    dbCollectionNames.chat_rooms,
  );
  return await connectionDB.findOne({
    referenceId: referenceObjectId,
    referenceType,
  });
};

const filterTicket = async (referenceInfo: ReferenceInfo) => {
  const { referenceId, referenceType } = referenceInfo;
  const participants: Participant[] = [];

  const referenceObjectId = dbUtils.convertToObjectId(referenceId);

  const connectionDB = await databaseClientServiceInstance.getDBCollection(
    dbCollectionNames.support_tickets,
  );
  const ticket = await connectionDB.findOne({
    _id: referenceObjectId,
  });

  if (!ticket) {
    throw new HttpException('Support ticket not found', HttpStatus.NOT_FOUND);
  }

  const { title, issueReporter, issueWithUser } = ticket;

  if (title && title.toLowerCase() === 'order' && issueWithUser) {
    participants.push({
      organisationId: issueWithUser.organisationId,
      outletId: issueWithUser.outletId,
      type: issueWithUser.type,
    });
  }

  participants.push({
    organisationId: issueReporter.organisationId,
    outletId: issueReporter.outletId,
    type: issueReporter.type,
  });

  const data = {
    referenceType,
    participants,
    referenceId: referenceObjectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return data;
};
