import { Collection, ObjectId } from 'mongodb';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { dbCollectionNames } from '../../db-connections';
import { DatabaseClientService } from '../../index.service';
import { dbUtils } from '../../utils';

interface ReferenceInfo {
  referenceId: string;
  referenceType: string;
}

interface Participant {
  organisationId: string;
  outletId?: string;
  type: string;
}

@Injectable()
export class ChatRoomsCollection {
  constructor(private readonly databaseClientService: DatabaseClientService) {}

  private async getCollection(): Promise<Collection> {
    return this.databaseClientService.getDBCollection(
      dbCollectionNames.chat_rooms,
    );
  }

  private async getSupportCollection(): Promise<Collection> {
    return this.databaseClientService.getDBCollection(
      dbCollectionNames.support_tickets,
    );
  }

  async createChatRoom(referenceInfo: ReferenceInfo) {
    const { referenceId, referenceType } = referenceInfo;
    const participants: Participant[] = [];
    const referenceObjectId = dbUtils.convertToObjectId(referenceId);

    try {
      const existingChatRoom = await this.findChatRoom(
        referenceObjectId,
        referenceType,
      );
      if (existingChatRoom) {
        throw new HttpException(
          'Chat room already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      const ticketCollection = await this.getSupportCollection();
      const filterTicket = await ticketCollection.findOne({
        _id: referenceObjectId,
      });

      if (!filterTicket) {
        throw new HttpException(
          'Support ticket not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const { title, issueReporter, issueWithUser } = filterTicket;

      participants.push({
        organisationId: issueReporter.organisationId,
        outletId: issueReporter.outletId,
        type: issueReporter.type,
      });

      if (title === 'order') {
        participants.push({
          organisationId: issueWithUser.organisationId,
          outletId: issueWithUser.outletId,
          type: issueWithUser.type,
        });
      }

      const data = {
        referenceType,
        participants,
        referenceId: referenceObjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const chatRoomCollection = await this.getCollection();
      await chatRoomCollection.insertOne(data);

      return 'Chat room created successfully';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  private async findChatRoom(
    referenceObjectId: ObjectId,
    referenceType: string,
  ) {
    const chatRoomCollection = await this.getCollection();
    return await chatRoomCollection.findOne({
      referenceId: referenceObjectId,
      referenceType,
    });
  }
}
