import { ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../../libs/database/index.service'; // Adjust the path as necessary
import { dbCollectionNames } from '../../../libs/database/db-connections'; // Ensure correct path
import { getActiveUsersMap } from './get-active-users-map'; // Ensure correct path
import { handleError } from './handle-error'; // Adjust the path as necessary
import { HttpStatus } from '@nestjs/common';
import { checkMerchantRoleAndStatus } from './check-merchant-role-status';

export async function getMerchantInfo(
  organisationId: string,
  outletId: string,
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
): Promise<string[]> {
  // Initialize an empty array to hold socket IDs
  let merchantSocketIds: string[] = [];

  try {
    // Step 1: Retrieve the ticket from the collection
    const ticketCollection = await databaseClientService.getDBCollection(
      dbCollectionNames.support_tickets,
    );
    const ticket = await ticketCollection.findOne({
      _id: new ObjectId(chatRoomId),
    });

    // Step 2: Check if the ticket is assigned to a specific merchant staff
    if (ticket?.assignedToMerchantStaff) {
      const assignedMerchantStaffId = ticket.assignedToMerchantStaff._id;
      const activeUsersMap = await getActiveUsersMap(databaseClientService);

      // Step 3: Check if the assigned staff is currently active
      if (activeUsersMap.has(assignedMerchantStaffId.toString())) {
        const assignedMerchantSocketId = activeUsersMap.get(
          assignedMerchantStaffId.toString(),
        )?.socketId;

        // If the assigned merchant staff has an active socket ID, add it to the array
        if (assignedMerchantSocketId) {
          console.log(
            `Assigned merchant staff is active. Socket ID: ${assignedMerchantSocketId} for chatRoomId: ${chatRoomId}`,
          );
          merchantSocketIds.push(assignedMerchantSocketId);
        } else {
          console.log(
            `Assigned merchant staff (ID: ${assignedMerchantStaffId}) is not active.`,
          );
        }
      }
    }

    // Step 4: If no assigned merchant staff, fall back to role-based staff
    if (merchantSocketIds.length === 0) {
      console.log(
        `No active assigned merchant staff for chatRoomId: ${chatRoomId}. Checking role-based staff.`,
      );

      const { activeStaffs } = await checkMerchantRoleAndStatus(
        databaseClientService,
        organisationId,
        outletId,
      );

      // Step 5: If there are active role-based staff members, add their socket IDs to the array
      if (activeStaffs.length > 0) {
        const activeStaffSocketIds = activeStaffs
          .filter((staff) => staff.socketId) // Only include staff with socket IDs
          .map((staff) => staff.socketId);

        if (activeStaffSocketIds.length > 0) {
          activeStaffSocketIds.forEach((socketId) => {
            console.log(
              `Role-based staff. Socket ID: ${socketId} for chatRoomId: ${chatRoomId}`,
            );
          });
          merchantSocketIds = merchantSocketIds.concat(activeStaffSocketIds); // Add role-based staff IDs to the array
        }
      }
    }

    // Step 6: Log if no active staff were found
    if (merchantSocketIds.length === 0) {
      console.log(
        `No active merchant staff found for organisationId: ${organisationId}, outletId: ${outletId}`,
      );
    }

    // Step 7: Return the array (empty if no staff found)
    return merchantSocketIds;
  } catch (error) {
    // Step 8: Handle any errors that occur during the process
    console.error('Error fetching merchant info:', error.message);
    handleError(
      `Error fetching merchant info for organisationId: ${organisationId}, outletId: ${outletId}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
