import { ObjectId } from 'mongodb';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';
import { dbUtils } from 'src/libs/database/utils';
import { getCustomerDetails } from '../../chat/usecase/get-customer-details';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { ScheduleUnreadMessagesCollection } from '../../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';

export const processCustomerNotification = async (
  customer: { organisationId: ObjectId; type: string },
  senderId: ObjectId,
  messageData: CreateChatMessageDto,
  messageId: ObjectId,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessages: ScheduleUnreadMessagesCollection,
) => {
  const customerOrganisationId = dbUtils.convertToObjectId(
    customer.organisationId,
  );

  // Skip notification if the sender is the customer
  if (customerOrganisationId.equals(senderId)) {
    console.log('Sender is the customer, skipping notification.');
    return;
  }

  // Retrieve customer details and send notification
  const customerDetails = await getCustomerDetails(
    databaseClientService,
    customer.organisationId,
  );
  const { email, firstName, lastName, userId } = customerDetails;
  const name = `${firstName} ${lastName}`;

  const emailDetails = {
    email,
    name,
    userId,
    messageId,
    message: messageData.body.content,
  };

  await scheduleUnreadMessages.createScheduleUnreadMessages(emailDetails);
};
