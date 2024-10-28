import { getMerchantStaffInfo } from '../../chat/usecase/get-merchant-staff-info';
import { checkMerchantRoleAndStatus } from '../../chat/usecase/check-merchant-role-status';
import { DatabaseClientService } from 'src/libs/database/index.service';
import { ScheduleUnreadMessagesCollection } from '../../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';

export const notifyAllMerchantStaff = async (
  merchant,
  senderId,
  messageData,
  messageId,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessagesCollection: ScheduleUnreadMessagesCollection,
) => {
  const { organisationId, outletId } = merchant;
  const { staffMembers } = await checkMerchantRoleAndStatus(
    databaseClientService,
    organisationId,
    outletId,
  );

  await Promise.all(
    staffMembers.map(async (staff) => {
      const staffDetails = await getMerchantStaffInfo(
        databaseClientService,
        staff._id,
      );
      if (staffDetails && !staffDetails._id.equals(senderId)) {
        const { email, firstName, lastName, _id: userId } = staffDetails;
        const name = `${firstName} ${lastName}`;

        const emailDetails = {
          name,
          email,
          messageId,
          userId,
          message: messageData.body.content,
        };

        await scheduleUnreadMessagesCollection.createScheduleUnreadMessages(
          emailDetails,
        );
      }
    }),
  );
};
