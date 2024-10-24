import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseClientService } from '../../index.service';
import { Collection, ObjectId } from 'mongodb';
import { dbCollectionNames } from '../../db-connections';
import {
  CreateChatMessageDto,
  ReadByDto,
} from '../../../../core/dto/chat-event/index';
import { dbUtils } from '../../utils';
import { ScheduleUnreadMessagesCollection } from '../schedule-unread-messages/schedule-unread-messages';
import { handleError } from '../../../../services/chat/usecase/handle-error';
import { setScheduler } from '../../../../services/schedule-unread-messages/usecase/set-scheduler';
import { removeUserFromScheduler } from '../../../../services/schedule-unread-messages/usecase/remove-user-from-scheduler';
import { AgendaProvider } from '../../../../services/agenda/agenda.provider';

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

      // Insert the message into the chat events collection
      const result = await chatEventCollection.insertOne({
        ...messageData,
        chatRoomId: chatRoomIdObjectId,
      });

      // Check if the insertion was successful
      if (result.insertedId) {
        // Schedule any additional tasks related to the message

        await this.scheduler(messageData, result.insertedId);

        // Return the message data with insertedId
        return {
          ...messageData,
          _id: result.insertedId, // Keep it as ObjectId
        };
      } else {
        handleError(
          'Failed to create message',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      handleError(
        error.message || 'An error occurred while sending the message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMessagesByChatRoomId(chatRoomId: string) {
    try {
      const connectionDB = await this.getCollection(
        dbCollectionNames.chat_events,
      );
      const chatRoomIdObjectId = dbUtils.convertToObjectId(chatRoomId);

      const messages = await connectionDB
        .find({
          chatRoomId: chatRoomIdObjectId,
        })
        .toArray();
      return messages;
    } catch (error) {
      console.error('Error in getting message:', error.message);
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

      if (message.sender._id.toString() === userId) {
        results.push({
          messageId: messageIdObject,
          success: true,
          message: 'Sender does not need to view their own message',
        });
        continue;
      }

      if (
        message.readBy?.some((entry) =>
          entry.userId.equals(dbUtils.convertToObjectId(userId)),
        )
      ) {
        results.push({
          messageId: messageIdObject,
          success: true,
          message: 'Message already viewed',
        });
        continue;
      }

      if (!message.readBy) {
        message.readBy = [];
      }

      const newReadByEntry: ReadByDto = {
        userId: dbUtils.convertToObjectId(userId),
        type: 'viewer',
        timestamp: new Date().toISOString(),
      };

      message.readBy.push(newReadByEntry);
      await connectionDB.updateOne(
        { _id: messageIdObject },
        { $set: { readBy: message.readBy, updatedAt: new Date() } },
      );

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

  async scheduler(messageData: CreateChatMessageDto, messageId: ObjectId) {
    try {
      await setScheduler(
        messageData,
        messageId,
        this.databaseClientService,
        this.scheduleUnreadMessagesCollection,
      );
    } catch (error) {
      handleError('Error in scheduler function: ' + error.message);
    }
  }
}
