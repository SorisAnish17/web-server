import { HttpException, HttpStatus } from '@nestjs/common';
import { ObjectId, Collection } from 'mongodb';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';
import { MessageDto, ParticipantDto } from 'src/core/dto/chat-event';
import { dbCollectionNames } from '../../../libs/database/db-connections';
import { DatabaseClientService } from 'src/libs/database/index.service';
import { Server } from 'socket.io';
import { TicketGatewayServer } from 'src/services/ticket-gateway/ticket.gateway.service';
import { ScheduleUnreadMessageService } from 'src/services/schedule-unread-messages/schedule-unread.service';

// Main sendMessage function
export const sendMessage = (
  chatRoomsCollection: ChatEventCollection,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessageService: ScheduleUnreadMessageService,
  ticketGatewayServer: TicketGatewayServer,
) => {
  return async (messageData: MessageDto): Promise<MessageDto> => {
    try {
      const message = await chatRoomsCollection.createMessage(messageData);
      const server = await ticketGatewayServer.getServer();

      await scheduleUnreadMessageService.setScheduler(message);

      await processParticipants(
        messageData.chatRoomId,
        databaseClientService,
        server,
        message,
      );

      await handleInternalAdminStaffs(
        message,
        databaseClientService,
        messageData.chatRoomId,
        server,
      );

      return message;
    } catch (error) {
      handleError(
        error instanceof HttpException
          ? error.message
          : 'Failed to create message',
      );
    }
  };
};

// Fetch participants of a chat room
async function getParticipants(
  databaseClientService: DatabaseClientService,
  chatRoomId: string,
) {
  const chatRoomCollection: Collection =
    await databaseClientService.getDBCollection(dbCollectionNames.chat_rooms);
  const chatRoom = await chatRoomCollection.findOne({
    referenceId: new ObjectId(chatRoomId),
  });

  if (!chatRoom) handleError('Chat room not found', HttpStatus.NOT_FOUND);

  return chatRoom?.participants || [];
}

// Fetch active users with socket IDs
async function getActiveUsersMap(databaseClientService: DatabaseClientService) {
  const onlineActivityCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.online_activity,
  );
  const activeUsersData = await onlineActivityCollection
    .find({ status: 'online' })
    .toArray();

  return new Map(
    activeUsersData.map((user) => [
      user.userId.toString(),
      { socketId: user.socketId },
    ]),
  );
}

// Process each participant of a chat room
async function processParticipants(
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
  server: Server,
  message: MessageDto,
) {
  const participants = await getParticipants(databaseClientService, chatRoomId);
  await Promise.all(
    participants.map((participant) =>
      handleParticipant(
        message,
        participant,
        chatRoomId,
        databaseClientService,
        server,
      ),
    ),
  );
}

// Handle different types of participants
async function handleParticipant(
  message: MessageDto,
  participant: ParticipantDto,
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
  server: Server,
) {
  try {
    if (participant.type === 'customer') {
      await handleCustomer(message, participant, databaseClientService, server);
    } else if (participant.type === 'merchant' && participant.outletId) {
      await handleMerchantStaff(
        message,
        participant,
        chatRoomId,
        databaseClientService,
        server,
      );
    }
  } catch (error) {
    console.error(`Error processing participant: ${participant.type}`, error);
  }
}

// Emit message to a customer if online
async function handleCustomer(
  message: MessageDto,
  participant: ParticipantDto,
  databaseClientService: DatabaseClientService,
  server: Server,
) {
  const activeUsers = await getActiveUsersMap(databaseClientService);
  const customerSocket = activeUsers.get(participant.organisationId.toString());

  if (customerSocket) {
    server.to(customerSocket.socketId).emit('newMessage', message);
  }
}

// Emit message to a merchant staff based on assignment and role
async function handleMerchantStaff(
  message: MessageDto,
  participant: ParticipantDto,
  chatRoomId: string,
  databaseClientService: DatabaseClientService,
  server: Server,
) {
  const ticket = await getTicketById(databaseClientService, chatRoomId);

  if (ticket?.assignedToMerchantStaff) {
    await emitToAssignedMerchantStaff(
      message,
      ticket.assignedToMerchantStaff._id,
      databaseClientService,
      server,
    );
  } else {
    await emitToRoleBasedMerchantStaff(
      message,
      participant,
      databaseClientService,
      server,
    );
  }
}

// Fetch support ticket details
async function getTicketById(
  databaseClientService: DatabaseClientService,
  ticketId: string,
) {
  const supportTicketCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.support_tickets,
  );
  return await supportTicketCollection.findOne({ _id: new ObjectId(ticketId) });
}

// Emit message to assigned merchant staff if online
async function emitToAssignedMerchantStaff(
  message: MessageDto,
  staffId: string,
  databaseClientService: DatabaseClientService,
  server: Server,
) {
  const activeUsersMap = await getActiveUsersMap(databaseClientService);
  const staffSocketId = activeUsersMap.get(staffId)?.socketId;

  if (staffSocketId) {
    server.to(staffSocketId).emit('newMessage', message);
  }
}

// Emit message to merchant staff with roles having access
async function emitToRoleBasedMerchantStaff(
  message: MessageDto,
  participant: ParticipantDto,
  databaseClientService: DatabaseClientService,
  server: Server,
) {
  const { activeStaffs } = await fetchMerchantStaffByRole(
    databaseClientService,
    participant.organisationId,
    participant.outletId,
  );

  activeStaffs.forEach((staff) => {
    if (staff.socketId) server.to(staff.socketId).emit('newMessage', message);
  });
}

// Fetch merchant staff based on roles
async function fetchMerchantStaffByRole(
  databaseClientService: DatabaseClientService,
  organisationId: string,
  outletId: string,
) {
  const rolesCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.merchants_roles_and_permissions,
  );
  const staffCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.merchants_staff,
  );

  const roles = await rolesCollection
    .find({
      merchantId: new ObjectId(organisationId),
      'permissions.support': { $all: ['access', 'chat'] },
    })
    .toArray();
  const staffMembers = await staffCollection
    .find({
      selectedOutlet: outletId,
      role: { $in: roles.map((role) => role.role) },
    })
    .toArray();

  const activeUsersMap = await getActiveUsersMap(databaseClientService);
  const activeStaffs = staffMembers
    .filter((staff) => activeUsersMap.has(staff._id.toString()))
    .map((staff) => ({
      userId: staff._id,
      socketId: activeUsersMap.get(staff._id.toString())?.socketId || null,
    }));

  return { activeStaffs, staffMembers };
}

// Handle internal admin staffs for a support ticket
async function handleInternalAdminStaffs(
  message: MessageDto,
  databaseClientService: DatabaseClientService,
  chatRoomId: string,
  server: Server,
) {
  const ticket = await getTicketById(databaseClientService, chatRoomId);

  if (ticket?.assignedToAdminStaff) {
    const adminId = ticket.assignedToAdminStaff._id;
    await emitToAdminStaff(message, adminId, databaseClientService, server);
  } else {
    await emitToAdminStaffByRole(message, databaseClientService, server);
  }
}

// Emit message to specific admin staff if online
async function emitToAdminStaff(
  message: MessageDto,
  adminId: string,
  databaseClientService: DatabaseClientService,
  server: Server,
) {
  const activeUsersMap = await getActiveUsersMap(databaseClientService);
  const socketId = activeUsersMap.get(adminId)?.socketId;

  if (socketId) server.to(socketId).emit('newMessage', message);
}

// Emit message to admin staff with specific roles
async function emitToAdminStaffByRole(
  message: MessageDto,
  databaseClientService: DatabaseClientService,
  server: Server,
) {
  const rolesCollection = await databaseClientService.getDBCollection(
    dbCollectionNames._internal_admins_roles_and_permissions,
  );
  const adminCollection = await databaseClientService.getDBCollection(
    dbCollectionNames._internal_admins,
  );

  const roles = await rolesCollection
    .find({
      'permissions.support.canAccess': true,
      'permissions.support.chat': true,
    })
    .toArray();
  const admins = await adminCollection
    .find({ role: { $in: roles.map((role) => role.role) } })
    .toArray();

  const activeUsersMap = await getActiveUsersMap(databaseClientService);
  admins.forEach((admin) => {
    const socketId = activeUsersMap.get(admin._id.toString())?.socketId;
    if (socketId) server.to(socketId).emit('newMessage', message);
  });
}

// Handle errors consistently
function handleError(
  message: string,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
): never {
  throw new HttpException(message, status);
}
