import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ClientSession, Collection } from 'mongodb';
import { OnlineActivityDto } from '../../../../core/dto/online-activity/index';
import { DatabaseClientService } from '../../index.service';
import { dbCollectionNames } from '../../db-connections';
import { dbUtils } from '../../utils';

@Injectable()
export class OnlineActivityCollection {
  constructor(private readonly databaseClientService: DatabaseClientService) {}

  private async getCollection(): Promise<Collection> {
    return await this.databaseClientService.getDBCollection(
      dbCollectionNames.online_activity,
    );
  }

  async createOnlineActivity(
    socketConnection: OnlineActivityDto,
    session?: ClientSession,
  ): Promise<string> {
    try {
      const connectCollection = await this.getCollection();
      await connectCollection.insertOne(socketConnection, {
        ...(session && { session }),
      });

      return 'Online activity created successfully';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  public async updateStatusByUserId(
    userId: string,
    socketId: string,
    newStatus: string,
    session?: ClientSession,
  ): Promise<string> {
    const connectCollection = await this.getCollection();
    const userObjectId = dbUtils.convertToObjectId(userId);

    try {
      const result = await connectCollection.updateOne(
        { userId: userObjectId },
        {
          $set: {
            socketId,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          },
        },
        { session },
      );

      if (result.modifiedCount > 0) {
        return `Status updated to '${newStatus}' and socket ID set for user ID: ${userId}.`;
      } else {
        return `No changes made to the status for user ID: ${userId}.`;
      }
    } catch (error) {
      console.error('Error updating status:', error);
      throw new HttpException(
        'Failed to update status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
