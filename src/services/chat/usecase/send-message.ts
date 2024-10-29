import { HttpException, HttpStatus } from '@nestjs/common';
import { ObjectId, Collection } from 'mongodb';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';
import { dbCollectionNames } from '../../../libs/database/db-connections';
import { DatabaseClientService } from 'src/libs/database/index.service';

interface Participant {
  type: string;
  organisationId: string;
  outletId?: string;
}

interface ProcessedParticipantsResult {
  activeCustomerSocketId: string | null;
  merchantSocketIds: string[] | null;
}

export const sendMessage = (
  chatRoomsCollection: ChatEventCollection,
  databaseClientService: DatabaseClientService,
) => {
  return async (
    messageData: CreateChatMessageDto,
  ): Promise<CreateChatMessageDto> => {
    try {
      await processParticipants(
        messageData.chatRoomId,
        databaseClientService, // Pass the instance here
      );

      // Step 3: Check the internal admin staff for notifications
      await checkInternalAdminStaffs(
        databaseClientService,
        messageData.chatRoomId,
      );

      // Step 4: Send the message to the chat room
      const message = await chatRoomsCollection.createMessage(messageData);

      // Return the message that was sent
      return message;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to create message',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};

async function getParticipants(
  databaseClientService: DatabaseClientService,
  chatRoomId: string,
): Promise<any> {
  const chatRoomCollection: Collection =
    await databaseClientService.getDBCollection(dbCollectionNames.chat_rooms);
  const chatRoomIdObjectId = new ObjectId(chatRoomId);

  const filterRoom = await chatRoomCollection.findOne({
    referenceId: chatRoomIdObjectId,
  });

  if (!filterRoom) {
    handleError('Chat room not found', HttpStatus.NOT_FOUND);
  }

  return filterRoom.participants;
}

async function getActiveUsersMap(
  databaseClientService: DatabaseClientService,
): Promise<Map<string, { socketId: string }>> {
  // Retrieve the online activity collection
  const onlineActivityCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.online_activity,
  );

  // Find all users who are currently online
  const activeUsersData = await onlineActivityCollection
    .find({ status: 'online' })
    .toArray();

  // Build a map with the userId as key and socketId as value
  return new Map(
    activeUsersData.map((user) => [
      user.userId.toString(),
      { socketId: user.socketId }, // Ensure socketId is included
    ]),
  );
}

async function processParticipants(
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
): Promise<ProcessedParticipantsResult> {
  // Fetch participants from the database
  const participants = await getParticipants(databaseClientService, chatRoomId);

  let activeCustomerSocketId: string | null = null; // Store the active customer socket ID
  const merchantSocketIds: string[] = []; // Initialize as an empty array for merchant socket IDs

  // Process each participant concurrently
  if (participants && participants.length > 0) {
    await Promise.all(
      participants.map((participant) =>
        processParticipant(participant, chatRoomId, databaseClientService),
      ),
    ).then((results) => {
      results.forEach((result) => {
        if (result.activeCustomerSocketId) {
          activeCustomerSocketId = result.activeCustomerSocketId; // Update if available
        }
        if (result.merchantSocketIds) {
          merchantSocketIds.push(...result.merchantSocketIds); // Collect merchant socket IDs
        }
      });
    });
  }

  return {
    activeCustomerSocketId,
    merchantSocketIds: merchantSocketIds.length > 0 ? merchantSocketIds : null,
  };
}

async function processParticipant(
  participant: any, // Use a specific type if available
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
): Promise<{
  activeCustomerSocketId: string | null;
  merchantSocketIds: string[] | null;
}> {
  try {
    if (participant.type === 'customer') {
      // Handle customer and return active socket ID
      const customerInfo = await handleCustomer(
        participant,
        databaseClientService,
      );
      return {
        activeCustomerSocketId: customerInfo?.activeCustomerSocketId || null,
        merchantSocketIds: null, // No merchant IDs for customers
      };
    } else if (participant.type === 'merchant' && participant.outletId) {
      const merchantSocketId = await getMerchantInfo(
        participant.organisationId,
        participant.outletId,
        chatRoomId,
        databaseClientService,
      );

      return {
        activeCustomerSocketId: null,
        merchantSocketIds:
          merchantSocketId.length > 0 ? merchantSocketId : null,
      };
    }
  } catch (error) {
    console.error(
      `Error processing participant of type "${participant.type}": ${error.message}`,
    );
  }

  return { activeCustomerSocketId: null, merchantSocketIds: null }; // Default return
}

const handleCustomer = async (
  participant: Participant,
  databaseClientService: DatabaseClientService,
): Promise<{
  activeCustomerSocketId: string | null;
} | null> => {
  try {
    const activeUsers = await getActiveUsersMap(databaseClientService);

    const onlineCustomer = activeUsers.get(
      participant.organisationId.toString(),
    );
    const activeCustomerSocketId = onlineCustomer
      ? onlineCustomer.socketId
      : null;

    if (participant) {
      return {
        activeCustomerSocketId,
      };
    }
  } catch (error) {
    console.error(`Error handling customer: ${error.message}`);
    return null;
  }

  return null;
};

async function getMerchantInfo(
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

async function checkMerchantRoleAndStatus(
  databaseClientService: DatabaseClientService,
  organisationId: string,
  outletId: string,
) {
  try {
    // Step 1: Fetch the roles and permissions for the organization
    const rolesCollection = await databaseClientService.getDBCollection(
      dbCollectionNames.merchants_roles_and_permissions,
    );

    const staffCollection = await databaseClientService.getDBCollection(
      dbCollectionNames.merchants_staff,
    );

    // Step 2: Retrieve roles and permissions based on the merchantId
    const rolesAndPermissions = await rolesCollection
      .find({ merchantId: new ObjectId(organisationId) })
      .toArray();

    // Step 3: Filter roles that have access to support and chat features
    const filteredRoles = rolesAndPermissions
      .filter(
        (role) =>
          role.permissions.support.includes('access') &&
          role.permissions.support.includes('chat'), // Fixed the typo here
      )
      .map((role) => role.role);

    // Step 4: Retrieve staff members that belong to the filtered roles and selected outlet
    const staffMembers = await staffCollection
      .find({ selectedOutlet: outletId, role: { $in: filteredRoles } })
      .toArray();

    // Step 5: Fetch the map of active users
    const activeUsersMap = await getActiveUsersMap(databaseClientService);

    // Step 6: Filter staff members who are active (present in the activeUsersMap)
    const activeStaffs = staffMembers
      .filter((staff) => activeUsersMap.has(staff._id.toString()))
      .map((staff) => ({
        userId: staff._id,
        socketId: activeUsersMap.get(staff._id.toString())?.socketId || null,
      }));

    // Step 7: Return active staff members and all staff members
    return { activeStaffs, staffMembers };
  } catch (error) {
    // Step 8: Handle any errors that occur during the process
    handleError(
      `Error fetching roles and permissions: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

async function checkInternalAdminStaffs(
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

function handleError(
  message: string,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
): never {
  throw new HttpException(message, status);
}
