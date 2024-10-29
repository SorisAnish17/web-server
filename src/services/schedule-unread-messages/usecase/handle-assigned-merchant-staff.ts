import { DatabaseClientService } from 'src/libs/database/index.service';
import { dbUtils } from '../../../libs/database/utils';
import { getMerchantStaffInfo } from './get-merchant-staff-info';
import { checkMerchantNotificationPreference } from '../usecase/check-merchant-notification-preference';
import { ScheduleUnreadMessagesCollection } from '../../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';

export const handleAssignedMerchantStaffNotification = async (
  ticket,
  senderId,
  messageData,
  messageId,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessages: ScheduleUnreadMessagesCollection,
) => {
  const assignedMerchantStaffId = dbUtils.convertToObjectId(
    ticket.assignedToMerchantStaff._id,
  );

  // Skip if the sender is the assigned merchant staff
  if (assignedMerchantStaffId.equals(senderId)) {
    console.log(
      'Sender is the assigned merchant staff, skipping notification.',
    );
    return;
  }

  // Retrieve assigned staff details and send notification if enabled
  const staffDetails = await getMerchantStaffInfo(
    databaseClientService,
    assignedMerchantStaffId,
  );
  if (staffDetails) {
    const notificationEnabled = await checkMerchantNotificationPreference(
      staffDetails._id,
      databaseClientService,
    );
    const { firstName, lastName, email, staffId: userId } = staffDetails;
    const name = `${firstName} ${lastName}`;

    const emailDetails = {
      name,
      email,
      userId,
      message: messageData.body.content,
      messageId,
    };

    if (notificationEnabled) {
      await scheduleUnreadMessages.createScheduleUnreadMessages(emailDetails);
    } else {
      console.log('Notification not enabled for the assigned merchant staff.');
    }
  } else {
    console.log('No assigned merchant staff found.');
  }
};
