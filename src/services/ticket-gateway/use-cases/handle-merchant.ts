import { ObjectId } from 'mongodb';
import { getMessageById } from './get-chat-room-details';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from 'src/libs/database/db-connections';
import { getActiveUsersMap } from './get-active-users-map';

export const handleMerchant = async (
  messageId: ObjectId,
  chatRoomId: string,
  organisationId: ObjectId,
  outletId: ObjectId,
) => {
  try {
    const databaseClientService = new DatabaseClientService();

    // Fetch the support ticket by chatRoomId
    const ticketDb = await databaseClientService.getDBCollection(
      dbCollectionNames.support_tickets,
    );
    const filterTicket = await ticketDb.findOne({
      _id: new ObjectId(chatRoomId),
    });

    // Fetch message details
    const message = await getMessageById(messageId);

    // Fetch active users map
    const activeUsers = await getActiveUsersMap(databaseClientService);

    // Check if assigned to merchant staff
    if (filterTicket?.assignedToMerchantStaff) {
      const assignedStaffId = filterTicket.assignedToMerchantStaff._id;
      const hasRead = message.readBy.some((reader) =>
        reader.userId.equals(assignedStaffId),
      );

      if (hasRead) {
        console.log(`Assigned merchant staff has read the message.`);
      } else {
        console.log(`Assigned merchant staff has not read the message.`);
        const user = activeUsers.get(organisationId.toString());
        if (user) {
          console.log(
            `Socket ID for organisation ${organisationId}: ${user.socketId}`,
          );
          // Notify the organisation if needed
        }
      }
    } else {
      const rolesCollection = await databaseClientService.getDBCollection(
        dbCollectionNames.merchants_roles_and_permissions,
      );
      const staffCollection = await databaseClientService.getDBCollection(
        dbCollectionNames.merchants_staff,
      );

      // Retrieve roles and permissions based on the organisationId
      const rolesAndPermissions = await rolesCollection
        .find({ merchantId: organisationId })
        .toArray();

      // Filter roles that have access to support and chat features
      const filteredRoles = rolesAndPermissions
        .filter(
          (role) =>
            role.permissions.support.includes('access') &&
            role.permissions.support.includes('chat'),
        )
        .map((role) => role.role);

      // Retrieve staff members that belong to the filtered roles and selected outlet
      const staffMembers = await staffCollection
        .find({ selectedOutlet: outletId, role: { $in: filteredRoles } })
        .toArray();

      const roleBasedStaffIds = staffMembers.map((staff) => staff._id);

      // Check which role-based staff have read the message
      const staffReadStatus = roleBasedStaffIds.map((staffId) => ({
        staffId,
        hasRead: message.readBy.some((reader) => reader.userId.equals(staffId)),
      }));

      // Filter staff who have not read the message
      const staffNotRead = staffReadStatus.filter((staff) => !staff.hasRead);

      // Log and handle notifications for staff who have not read the message
      if (staffNotRead.length > 0) {
        console.log(
          `Staff who have not read the message:`,
          staffNotRead.map((staff) => staff.staffId),
        );

        // Retrieve socket IDs for those who have not read the message
        staffNotRead.forEach(({ staffId }) => {
          const user = activeUsers.get(staffId.toString());
          if (user) {
            console.log(`Socket ID for staff ${staffId}: ${user.socketId}`);
            // Send notification to this staff using user.socketId
          } else {
            console.log(`Staff ${staffId} is not active.`);
          }
        });
      } else {
        console.log(`All role-based staff have read the message.`);
      }

      console.log(`No assigned merchant staff for chatRoomId: ${chatRoomId}`);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
