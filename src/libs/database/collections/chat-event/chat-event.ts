import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseClientService } from '../../index.service';
import { Collection, ObjectId } from 'mongodb';
import { dbCollectionNames } from '../../db-connections';
import { MessageDto, ReadByDto } from '../../../../core/dto/chat-event/index';
import { dbUtils } from '../../utils';

type CollectionNames = keyof typeof dbCollectionNames;

@Injectable()
export class ChatEventCollection {
  constructor(private readonly databaseClientService: DatabaseClientService) {}

  private async getCollection(
    collectionName: CollectionNames,
  ): Promise<Collection> {
    return await this.databaseClientService.getDBCollection(collectionName);
  }

  async createMessage(messageData: MessageDto): Promise<MessageDto> {
    try {
      const chatRoomIdObjectId = dbUtils.convertToObjectId(
        messageData.chatRoomId,
      );

      const chatEventCollection = await this.getCollection(
        dbCollectionNames.chat_events,
      );

      const timestamp = new Date();

      const result = await chatEventCollection.insertOne({
        ...messageData,
        chatRoomId: chatRoomIdObjectId,
        createdAt: timestamp, // Add the timestamp field
      });

      if (result.insertedId) {
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

  async findChatById(_id: ObjectId): Promise<MessageDto | null> {
    try {
      const connectionDB = await this.getCollection(
        dbCollectionNames.chat_events,
      );
      const findMessage = await connectionDB.findOne({ _id });

      return findMessage as MessageDto | null;
    } catch (error) {
      console.error('Error finding message:', error);
    }
  }

  async updateMessageReadBy(messageId: ObjectId, newReadByEntry: ReadByDto) {
    const connectionDB = await this.getCollection(
      dbCollectionNames.chat_events,
    );
    const messageIdObject = dbUtils.convertToObjectId(messageId);

    // Perform the update operation
    const result = await connectionDB.updateOne(
      { _id: messageIdObject },
      {
        $addToSet: { readBy: newReadByEntry },
        $set: { updatedAt: new Date() },
      },
    );

    // Check if the update was successful
    if (result.modifiedCount > 0) {
      return {
        messageId: messageIdObject,
        success: true,
        message: 'Message viewed successfully',
      };
    } else {
      return {
        messageId: messageIdObject,
        success: false,
        message: 'Message not updated',
      };
    }
  }

  private handleError(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ): never {
    throw new HttpException(message, status);
  }
}
