import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Collection } from 'mongodb';
import { DatabaseClientService } from '../../index.service';
import { dbCollectionNames } from '../../db-connections';
import { ScheduleUnreadMessageDto } from '../../../../core/dto/schedule-unread-messages/index';

@Injectable()
export class ScheduleUnreadMessagesCollection {
  constructor(private readonly databaseClientService: DatabaseClientService) {}

  private async getCollection(): Promise<Collection> {
    return this.databaseClientService.getDBCollection(
      dbCollectionNames.schedule_unread_messages,
    );
  }

  async createScheduleUnreadMessages(
    emailDetails: ScheduleUnreadMessageDto,
  ): Promise<string> {
    const connectionDB = await this.getCollection();
    const { email } = emailDetails;
    try {
      const existingMessage = await connectionDB.findOne({ email });

      if (existingMessage) {
        await this.incrementUnreadCount(connectionDB, email);
        return 'Unread message count incremented successfully';
      } else {
        const result = await connectionDB.insertOne(emailDetails);

        if (result.insertedId) {
          return 'Scheduled unread message stored successfully';
        } else {
          throw new Error('Failed to store the unread message');
        }
      }
    } catch (error) {
      console.error('Error while storing unread schedule messages:', error);
      throw new HttpException(
        'Internal server error while storing messages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async incrementUnreadCount(connectionDB: Collection, email: string) {
    const updatedResult = await connectionDB.updateOne(
      { email },
      { $inc: { unreadMessage: 1 } },
    );

    if (updatedResult.modifiedCount === 0) {
      throw new Error('Failed to increment unread message count');
    }
  }
}
