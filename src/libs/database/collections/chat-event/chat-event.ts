import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseClientService } from '../../index.service';
import { Collection } from 'mongodb';
import { dbCollectionNames } from '../../db-connections';
import { CreateChatMessageDto } from '../../../../core/dto/chat-event/index';

@Injectable()
export class ChatEventCollection {
  constructor(private readonly databaseClientService: DatabaseClientService) {}

  private async getCollection(): Promise<Collection> {
    return await this.databaseClientService.getDBCollection(
      dbCollectionNames.chat_events,
    );
  }

  private async getChatRoomCollection() {
    return await this.databaseClientService.getDBCollection(
      dbCollectionNames.chat_rooms,
    );
  }

  private async getOnlineActivityCollection() {
    return await this.databaseClientService.getDBCollection(
      dbCollectionNames.online_activity,
    );
  }

  async getParticipantsByChatRoomId(chatRoomId: string) {
    try {
      const chatRoomCollection = await this.getChatRoomCollection();

      const filterRoom = await chatRoomCollection.findOne({
        referenceNo: chatRoomId,
      });

      if (!filterRoom) {
        throw new HttpException('Chat room not found', HttpStatus.NOT_FOUND);
      }

      const customers = [];
      const merchants = [];
      const internalAdmins = [];
      const inactiveParticipants = [];

      // Fetch all active users
      const onlineActivityCollection = await this.getOnlineActivityCollection();
      const activeUsersData = await onlineActivityCollection
        .find({ status: 'online' })
        .toArray();

      // Create a Set for quick lookup of active user IDs
      const activeUserIds = new Set(
        activeUsersData.map((user) => user.userId.toString()),
      );

      // Iterate over participants and categorize them
      for (const participant of filterRoom.participants) {
        const userDetails = {
          organisationId: participant.organisationId,
          type: participant.type,
        };

        // Check if the participant is active or inactive
        if (activeUserIds.has(participant.organisationId.toString())) {
          // Active users
          if (participant.type === 'customer') {
            customers.push(userDetails);
          } else if (participant.type === 'merchant') {
            merchants.push(userDetails);
          } else if (participant.type === 'internalAdmin') {
            internalAdmins.push(userDetails);
          }
        } else {
          // Inactive participants
          inactiveParticipants.push(userDetails);
        }
      }

      // Return categorized participants along with inactive ones
      return {
        active: {
          customers,
          merchants,
          internalAdmins,
        },
        inactive: inactiveParticipants,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Modified sendMessage function
  async sendMessage(messageData: CreateChatMessageDto) {
    try {
      const { chatRoomId } = messageData;

      // Get participants for the chat room
      const participates = await this.getParticipantsByChatRoomId(chatRoomId);
      console.log('participate', participates);

      const connectionDB = await this.getCollection();

      const result = await connectionDB.insertOne(messageData);

      if (result.insertedId) {
        return { messageId: result.insertedId.toString() };
      } else {
        throw new HttpException(
          'Failed to create message',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
