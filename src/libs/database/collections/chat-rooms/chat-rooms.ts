import { Collection } from 'mongodb';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { dbCollectionNames } from '../../db-connections';
import { DatabaseClientService } from '../../index.service';
import { dbUtils } from '../../utils';

@Injectable()
export class ChatRoomsCollection {
  constructor(private readonly databaseClientService: DatabaseClientService) {}

  private async getCollection(): Promise<Collection> {
    return this.databaseClientService.getDBCollection(
      dbCollectionNames.chat_rooms,
    );
  }

  async createChatRoom(data) {
    try {
      const chatRoomCollection = await this.getCollection();
      await chatRoomCollection.insertOne(data);

      return 'Chat room created successfully';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getChatRoomByReferenceId(referenceId: string) {
    if (!referenceId) {
      throw new HttpException(
        'Reference ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const referenceObjectId = dbUtils.convertToObjectId(referenceId);
      const chatRoomCollection = await this.getCollection();

      const response = await chatRoomCollection.findOne({
        referenceId: referenceObjectId,
      });

      if (response) {
        return response;
      } else {
        throw new HttpException('Chat Room Not Found', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      console.error('Error retrieving chat room:', error);
      throw new HttpException(
        error.message || 'An error occurred while fetching the chat room',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
