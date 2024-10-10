import { Collection } from 'mongodb';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { dbCollectionNames } from '../../db-connections';
import { DatabaseClientService } from '../../index.service';

@Injectable()
export class ChatRoomsCollection {
  constructor(private readonly databaseClientService: DatabaseClientService) {}

  private async getCollection(): Promise<Collection> {
    return await this.databaseClientService.getDBCollection(
      dbCollectionNames.chat_rooms,
    );
  }

  private async SupportCollection(): Promise<Collection> {
    return await this.databaseClientService.getDBCollection(
      dbCollectionNames.support_tickets,
    );
  }

  async createChatRoom(referenceInfo: {
    referenceNo: string;
    referenceType: string;
  }) {
    const { referenceNo, referenceType } = referenceInfo;
    const participants = [];

    try {
      // Check for duplicate chat room
      const existingChatRoom = await this.findChatRoom(
        referenceNo,
        referenceType,
      );
      if (existingChatRoom) {
        throw new HttpException(
          'Chat room already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      const ticketCollection = await this.SupportCollection();
      const filterTicket = await ticketCollection.findOne({
        referenceNo,
      });

      const { title, issueReporter, issueWithUser } = filterTicket;

      if (title === 'order') {
        participants.push({
          organisationId: issueReporter.organisationId,
          ...(issueReporter.outletId !== undefined && {
            outletId: issueReporter.outletId,
          }),
          type: issueReporter.type,
        });
        participants.push({
          organisationId: issueWithUser.organisationId,
          ...(issueWithUser.outletId !== undefined && {
            outletId: issueWithUser.outletId,
          }),
          type: issueWithUser.type,
        });
      } else {
        participants.push({
          organisationId: issueReporter.organisationId,
          ...(issueReporter.outletId !== undefined && {
            outletId: issueReporter.outletId,
          }),
          type: issueReporter.type,
        });
      }

      const data = {
        referenceType,
        participants,
        referenceNo,
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

  private async findChatRoom(referenceNo: string, referenceType: string) {
    const chatRoomCollection = await this.getCollection();
    return await chatRoomCollection.findOne({
      referenceNo,
      referenceType,
    });
  }
}
