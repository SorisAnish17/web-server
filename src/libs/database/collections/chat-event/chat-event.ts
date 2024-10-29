import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseClientService } from '../../index.service';
import { Collection, ObjectId } from 'mongodb';
import { dbCollectionNames } from '../../db-connections';
import {
  CreateChatMessageDto,
  ReadByDto,
} from '../../../../core/dto/chat-event/index';
import { dbUtils } from '../../utils';
import { ScheduleUnreadMessagesCollection } from '../schedule-unread-messages/schedule-unread-messages';
import { setScheduler } from '../../../../services/schedule-unread-messages/usecase/set-scheduler';
import { removeUserFromScheduler } from '../../../../services/schedule-unread-messages/usecase/remove-user-from-scheduler';
import { AgendaProvider } from '../../../../services/agenda/agenda.controller';

type CollectionNames = keyof typeof dbCollectionNames;

@Injectable()
export class ChatEventCollection {
  constructor(
    private readonly databaseClientService: DatabaseClientService,
    private readonly scheduleUnreadMessagesCollection: ScheduleUnreadMessagesCollection,
    private readonly agenda: AgendaProvider,
  ) {}

  private async getCollection(
    collectionName: CollectionNames,
  ): Promise<Collection> {
    return await this.databaseClientService.getDBCollection(collectionName);
  }

  //scheduler

  async createMessage(
    messageData: CreateChatMessageDto,
  ): Promise<CreateChatMessageDto> {
    try {
      const chatRoomIdObjectId = dbUtils.convertToObjectId(
        messageData.chatRoomId,
      );

      const chatEventCollection = await this.getCollection(
        dbCollectionNames.chat_events,
      );

      const timestamp = new Date();

      // Insert the message into the chat events collection
      const result = await chatEventCollection.insertOne({
        ...messageData,
        chatRoomId: chatRoomIdObjectId,
        createdAt: timestamp, // Add the timestamp field
      });

      // Check if the insertion was successful
      if (result.insertedId) {
        // Schedule any additional tasks related to the message

        await setScheduler(
          messageData,
          result.insertedId,
          this.databaseClientService,
          this.scheduleUnreadMessagesCollection,
        );

        // Return the message data with insertedId
        return {
          ...messageData,
          _id: result.insertedId, // Keep it as ObjectId
        };
      } else {
        this.handleError(
          'Failed to create message',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.handleError(
        error.message || 'An error occurred while sending the message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMessagesByChatRoomId(
    chatRoomId: string,
    filterOptions: { pageNo: number; limit?: number },
  ) {
    try {
      const connectionDB = await this.getCollection(
        dbCollectionNames.chat_events,
      );
      const chatRoomIdObjectId = dbUtils.convertToObjectId(chatRoomId);
      const limit = filterOptions.limit || 10;

      // Get the total count of messages
      const totalMessages = await connectionDB.countDocuments({
        chatRoomId: chatRoomIdObjectId,
      });

      // Fetch the messages with pagination
      const messages = await connectionDB
        .find({ chatRoomId: chatRoomIdObjectId })
        .sort({ createdAt: -1 })
        .skip((filterOptions.pageNo - 1) * limit)
        .limit(limit)
        .toArray();

      // Return both the messages and the total count
      return {
        messages: messages.reverse(), // Reverse the messages if needed
        totalCount: totalMessages,
      };
    } catch (error) {
      console.error('Error in getting message:', error.message);
      throw error; // Optional: throw the error to be handled by the calling function
    }
  }

  async viewMessagesByMessageIds(userId: string, messageIdObjects: ObjectId[]) {
    const results = [];
    const connectionDB = await this.getCollection(
      dbCollectionNames.chat_events,
    );

    for (const messageIdObject of messageIdObjects) {
      const message = (await connectionDB.findOne({
        _id: messageIdObject,
      })) as CreateChatMessageDto;

      if (!message) {
        results.push({
          messageId: messageIdObject,
          success: false,
          message: 'Message not found',
        });
        continue;
      }

      // Check if the sender is viewing their own message
      if (message.sender._id.toString() === userId) {
        results.push({
          messageId: messageIdObject,
          success: true,
          message: 'Sender does not need to view their own message',
        });
        continue;
      }

      const userObjectId = dbUtils.convertToObjectId(userId);

      // Check if the message has already been viewed by the user
      if (message.readBy?.some((entry) => entry.userId.equals(userObjectId))) {
        results.push({
          messageId: messageIdObject,
          success: true,
          message: 'Message already viewed',
        });
        continue;
      }

      // Create the new readBy entry
      const newReadByEntry: ReadByDto = {
        userId: userObjectId,
        type: 'viewer',
        timestamp: new Date().toISOString(),
      };

      // Use $addToSet to prevent duplicate entries
      await connectionDB.updateOne(
        { _id: messageIdObject },
        {
          $addToSet: { readBy: newReadByEntry },
          $set: { updatedAt: new Date() },
        },
      );

      // Remove user from scheduler after viewing
      await removeUserFromScheduler(
        userId,
        messageIdObject.toString(),
        this.databaseClientService,
        this.agenda,
      );

      results.push({
        messageId: messageIdObject,
        success: true,
        message: 'Message viewed successfully',
      });
    }

    return results; // Return results for all message IDs
  }

  private handleError(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ): never {
    throw new HttpException(message, status);
  }
}
