import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ClientSession, Collection, ObjectId } from 'mongodb';
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

  async generateOnlineActivity(
    socketConnection: OnlineActivityDto,
    session?: ClientSession,
  ): Promise<string> {
    const userId = dbUtils.convertToObjectId(socketConnection.userId);

    try {
      const userExists = await this.doesUserIdExist(userId, session);

      if (userExists) {
        console.log(
          `User ID ${userId} already exists. Updating socket ID and status.`,
        );

        return await this.updateStatusByUserId(
          userId.toString(),
          socketConnection.socketId,
          'online',
          session,
        );
      } else {
        const activityToInsert = {
          ...socketConnection,
          userId,
          status: 'online',
          ...dbUtils.createdTimestamp(),
        };

        const connectCollection = await this.getCollection();
        await connectCollection.insertOne(activityToInsert, {
          ...(session && { session }),
        });

        return 'Online activity created successfully';
      }
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

  public async doesUserIdExist(
    userId: ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    const connectCollection = await this.getCollection();
    const user = await connectCollection.findOne({ userId }, { session });
    return !!user;
  }
}
