import { ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../../libs/database/index.service'; // Adjust the path as necessary
import { dbCollectionNames } from '../../../libs/database/db-connections'; // Ensure correct path
import { HttpStatus } from '@nestjs/common';
import { getActiveUsersMap } from './get-active-users-map';

export async function checkInternalAdminStaffs(
  databaseClientService: DatabaseClientService,
  chatRoomId: string,
): Promise<string[]> {
  const activeSocketIds: string[] = []; // To hold the active socket IDs

  try {
    // Step 1: Retrieve the chat room to check if there is an assigned admin staff
    const supportTicketCollection = await databaseClientService.getDBCollection(
      dbCollectionNames.support_tickets,
    );
    const ticketIdObjectId = new ObjectId(chatRoomId);
    const ticket = await supportTicketCollection.findOne({
      _id: ticketIdObjectId,
    });

    // Step 2: Check if the ticket has an assigned internal admin staff
    if (ticket?.assignedToAdminStaff) {
      const { _id: adminId } = ticket.assignedToAdminStaff;

      // Retrieve active users map
      const activeUsersMap = await getActiveUsersMap(databaseClientService);

      // Check if the assigned admin staff is active
      const socketId = activeUsersMap.get(adminId.toString())?.socketId;
      if (socketId) {
        activeSocketIds.push(socketId); // Add to the array if active
      }
    } else {
      // Step 3: If no admin is assigned, fetch admins based on roles/permissions

      // Retrieve internal admin roles and permissions collection
      const internalAdminsRolesCollection =
        await databaseClientService.getDBCollection(
          dbCollectionNames._internal_admins_roles_and_permissions,
        );

      // Find roles that have access to support and chat
      const rolesWithAccess = await internalAdminsRolesCollection
        .find({
          'permissions.support.canAccess': true,
          'permissions.support.chat': true,
        })
        .toArray();

      const roles = rolesWithAccess.map((role) => role.role);

      // Step 4: Find all internal admin staff with matching roles
      const internalAdminsCollection =
        await databaseClientService.getDBCollection(
          dbCollectionNames._internal_admins,
        );
      const matchingAdminStaffs = await internalAdminsCollection
        .find({ role: { $in: roles } })
        .toArray();

      // Fetch active users map
      const activeUsersMap = await getActiveUsersMap(databaseClientService);

      // Step 5: Add the socket IDs of all active admin staff members to the array
      matchingAdminStaffs.forEach((staff) => {
        const socketId = activeUsersMap.get(staff._id.toString())?.socketId;
        if (socketId) {
          activeSocketIds.push(socketId);
        }
      });
    }
  } catch (error) {
    // Log the error and handle accordingly
    console.error('Error on fetching the internal admin staff:', error.message);
    handleError(
      'Error fetching internal admin staff',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // Step 6: Return the array of active socket IDs (could be empty if no staff found)
  return activeSocketIds;
}
