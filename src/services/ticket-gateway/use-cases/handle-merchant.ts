import { ObjectId } from 'mongodb';
import { getMessageById } from './get-chat-room-details';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { dbCollectionNames } from 'src/libs/database/db-connections';
import { getActiveUsersMap } from '../../chat/usecase/get-active-users-map';

export const handleMerchant = async (
  messageId: ObjectId,
  chatRoomId: string,
  organisationId: ObjectId,
  outletId: ObjectId,
) => {
  try {
    const databaseClientService = new DatabaseClientService();

    const ticketDb = await databaseClientService.getDBCollection(
      dbCollectionNames.support_tickets,
    );

    const filterTicket = await ticketDb.findOne({
      _id: chatRoomId,
    });

    const message = await getMessageById(messageId);

    // Fetch active users map
    const activeUsers = await getActiveUsersMap(databaseClientService);

    if (filterTicket?.assignedToMerchantStaff) {
      const assignedStaffId = filterTicket.assignedToMerchantStaff._id;
      const hasRead = message.readBy.some((reader) =>
        reader.userId.equals(assignedStaffId),
      );

      if (hasRead) {
        console.log(`Assigned merchant staff has read the message.`);
        // Handle the case where the message has been read
      } else {
        console.log(`Assigned merchant staff has not read the message.`);
        // Handle the case where the message has not been read
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

      // Check if any role-based staff has read the message
      const hasReadAnyRoleBasedStaff = message.readBy.some((reader) =>
        roleBasedStaffIds.some((staffId) => reader.userId.equals(staffId)),
      );

      console.log('Role-based staff IDs:', roleBasedStaffIds);

      if (hasReadAnyRoleBasedStaff) {
        console.log(`At least one role-based staff has read the message.`);
        console.log('Active users:', activeUsers);
        // Handle the case where the message has been read
      } else {
        console.log(`No role-based staff has read the message.`);
        // Handle the case where the message has not been read
      }

      console.log(`No assigned merchant staff for chatRoomId: ${chatRoomId}`);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
