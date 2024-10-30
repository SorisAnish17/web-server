import { getMerchantStaffInfo } from './get-merchant-staff-info';
import { checkMerchantRoleAndStatus } from './check-merchant-role-status';
import { DatabaseClientService } from 'src/libs/database/index.service';
import { ScheduleUnreadMessagesCollection } from '../../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';
import { AgendaProvider } from '../../agenda/agenda.controller';

export const notifyAllMerchantStaff = async (
  merchant,
  senderId,
  messageData,
  messageId,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessagesCollection: ScheduleUnreadMessagesCollection,
  agendaProvider: AgendaProvider,
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
        await agendaProvider.scheduleJob(emailDetails);
      }
    }),
  );
};
