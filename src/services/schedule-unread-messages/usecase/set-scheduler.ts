import { dbUtils } from 'src/libs/database/utils';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';
import { ObjectId } from 'mongodb';
import { getChatRoomParticipate } from './chat-room-participate';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { processCustomerNotification } from './process-customer-notification';
import { processMerchantNotification } from './process-merchant-notification';
import { ScheduleUnreadMessagesCollection } from '../../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';
import { HttpException, HttpStatus } from '@nestjs/common';

export const setScheduler = async (
  messageData: CreateChatMessageDto,
  messageId: ObjectId,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessageCollection: ScheduleUnreadMessagesCollection,
) => {
  try {
    const chatRoomIdObjectId = dbUtils.convertToObjectId(
      messageData.chatRoomId,
    );
    const senderId = dbUtils.convertToObjectId(messageData.sender._id);

    // Fetch participants from the chat room
    const { participants } = await getChatRoomParticipate(
      chatRoomIdObjectId,
      databaseClientService,
    );

    // Get customer and merchant participants
    const customer =
      participants.find((participant) => participant.type === 'customer') ||
      null;
    const merchant =
      participants.find((participant) => participant.type === 'merchant') ||
      null;

    // Handle customer notifications
    if (customer) {
      await processCustomerNotification(
        customer,
        senderId,
        messageData,
        messageId,
        databaseClientService,
        scheduleUnreadMessageCollection,
      );
    } else {
      console.log('No customer found.');
    }

    // Handle merchant notifications
    if (merchant) {
      await processMerchantNotification(
        merchant,
        senderId,
        messageData,
        messageId,
        chatRoomIdObjectId,
        databaseClientService,
        scheduleUnreadMessageCollection,
      );
    } else {
      console.log('No merchant found.');
    }
  } catch (error) {
    throw new HttpException(
      'Error in scheduler function: ' + error.message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};
