import { ObjectId } from 'mongodb';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from '../../../libs/database/db-connections';
import { handleAssignedMerchantStaffNotification } from './handle-assigned-merchant-staff';
import { notifyAllMerchantStaff } from './notify-role-based-merchant-staff';
import { ScheduleUnreadMessagesCollection } from '../../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';

export const processMerchantNotification = async (
  merchant: { organisationId: string; outletId: string; type: string },
  senderId: ObjectId,
  messageData: CreateChatMessageDto,
  messageId: ObjectId,
  chatRoomIdObjectId: ObjectId,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessages: ScheduleUnreadMessagesCollection,
) => {
  const ticketCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.support_tickets,
  );
  const ticket = await ticketCollection.findOne({ _id: chatRoomIdObjectId });

  if (ticket?.assignedToMerchantStaff) {
    await handleAssignedMerchantStaffNotification(
      ticket,
      senderId,
      messageData,
      messageId,
      databaseClientService,
      scheduleUnreadMessages,
    );
  } else {
    console.log('Ticket is not assigned to any merchant staff.');
    await notifyAllMerchantStaff(
      merchant,
      senderId,
      messageData,
      messageId,
      databaseClientService,
      scheduleUnreadMessages,
    );
  }
};
