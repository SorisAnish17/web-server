import { dbUtils } from 'src/libs/database/utils';
import { MessageDto } from 'src/core/dto/chat-event';
import { ObjectId } from 'mongodb';
import { dbCollectionNames } from 'src/libs/database/db-connections';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { ScheduleUnreadMessagesCollection } from '../../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AgendaService } from '../../agenda/agenda.service';

export const setSchedule = (
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessageCollection: ScheduleUnreadMessagesCollection,
  agendaProvider: AgendaService,
) => {
  return async (message: MessageDto) => {
    try {
      const chatRoomIdObjectId = dbUtils.convertToObjectId(message.chatRoomId);
      const senderId = dbUtils.convertToObjectId(message.sender._id);

      // Fetch participants from the chat room
      const { participants } = await getChatRoomParticipate(
        chatRoomIdObjectId,
        databaseClientService,
      );

      // Get customer and merchant participants
      const customer =
        participants.find((participant) => participant.type === 'customer') ||
        null;
      const merchant =
        participants.find((participant) => participant.type === 'merchant') ||
        null;

      // Handle customer notifications
      if (customer) {
        await processCustomerNotification(
          customer,
          senderId,
          message,
          databaseClientService,
          scheduleUnreadMessageCollection,
          agendaProvider,
        );
      } else {
        console.log('No customer found.');
      }

      // Handle merchant notifications
      if (merchant) {
        await processMerchantNotification(
          merchant,
          senderId,
          message,
          chatRoomIdObjectId,
          databaseClientService,
          scheduleUnreadMessageCollection,
          agendaProvider,
        );
      } else {
        console.log('No merchant found.');
      }
    } catch (error) {
      throw new HttpException(
        'Error in scheduler function: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  };
};

const getChatRoomParticipate = async (
  chatRoomIdObjectId: ObjectId,
  databaseClientServcie: DatabaseClientService,
) => {
  const chatRoomCollection = await databaseClientServcie.getDBCollection(
    dbCollectionNames.chat_rooms,
  );
  const chatRoom = await chatRoomCollection.findOne({
    referenceId: chatRoomIdObjectId,
  });
  const { participants } = chatRoom;

  return { participants, chatRoom };
};

const processCustomerNotification = async (
  customer: { organisationId: ObjectId; type: string },
  senderId: ObjectId,
  message: MessageDto,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessages: ScheduleUnreadMessagesCollection,
  agendaProvider: AgendaService,
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
    message: message.body.content,
    messageId: message._id,
  };

  const response =
    await scheduleUnreadMessages.createScheduleUnreadMessages(emailDetails);

  if (response) {
    const { success } = response;
    if (success) await agendaProvider.scheduleJob(emailDetails);
  }
};

async function getCustomerDetails(
  databaseClientService: DatabaseClientService,
  customerOrganisationId: ObjectId,
) {
  const customersCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.customers,
  );
  const customerDts = await customersCollection.findOne({
    _id: customerOrganisationId,
  });

  const { firstName, lastName, email, _id: userId } = customerDts;

  return { firstName, lastName, email, userId };
}

const processMerchantNotification = async (
  merchant: { organisationId: string; outletId: string; type: string },
  senderId: ObjectId,
  message: MessageDto,
  chatRoomIdObjectId: ObjectId,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessages: ScheduleUnreadMessagesCollection,
  agendaProvider: AgendaService,
) => {
  const ticketCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.support_tickets,
  );
  const ticket = await ticketCollection.findOne({ _id: chatRoomIdObjectId });

  if (ticket?.assignedToMerchantStaff) {
    await handleAssignedMerchantStaffNotification(
      ticket,
      senderId,
      message,
      databaseClientService,
      scheduleUnreadMessages,
      agendaProvider,
    );
  } else {
    console.log('Ticket is not assigned to any merchant staff.');
    await notifyAllMerchantStaff(
      merchant,
      senderId,
      message,
      databaseClientService,
      scheduleUnreadMessages,
      agendaProvider,
    );
  }
};

const handleAssignedMerchantStaffNotification = async (
  ticket,
  senderId: ObjectId,
  message: MessageDto,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessages: ScheduleUnreadMessagesCollection,
  agendaProvider: AgendaService,
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
      message: message.body.content,
      messageId: message._id,
    };

    if (notificationEnabled) {
      const response =
        await scheduleUnreadMessages.createScheduleUnreadMessages(emailDetails);

      if (response) {
        const { success } = response;
        if (success) await agendaProvider.scheduleJob(emailDetails);
      }
    } else {
      console.log('Notification not enabled for the assigned merchant staff.');
    }
  } else {
    console.log('No assigned merchant staff found.');
  }
};

const notifyAllMerchantStaff = async (
  merchant,
  senderId: ObjectId,
  message: MessageDto,
  databaseClientService: DatabaseClientService,
  scheduleUnreadMessagesService: ScheduleUnreadMessagesCollection,
  agendaProvider: AgendaService,
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
          messageId: message._id,
          userId,
          message: message.body.content,
        };

        const response =
          await scheduleUnreadMessagesService.createScheduleUnreadMessages(
            emailDetails,
          );

        if (response) {
          const { success } = response;
          if (success) await agendaProvider.scheduleJob(emailDetails);
        }
      }
    }),
  );
};

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
    throw new HttpException(
      `Error fetching roles and permissions: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

async function getMerchantStaffInfo(
  databaseClientService: DatabaseClientService,
  assignedMerchantStaffId: ObjectId,
) {
  // Retrieve the merchants_staff collection from the database
  const staffCollection = await databaseClientService.getDBCollection(
    dbCollectionNames.merchants_staff,
  );

  // Find the staff details based on the given staff ID
  const staffDetails = await staffCollection.findOne({
    _id: new ObjectId(assignedMerchantStaffId),
  });

  // Return the staff details
  return staffDetails;
}
const checkMerchantNotificationPreference = async (
  staffId: ObjectId,
  databaseClientService: DatabaseClientService,
) => {
  try {
    const connectionDB = await databaseClientService.getDBCollection(
      dbCollectionNames.merchants_staff_settings,
    );

    const checkPermission = await connectionDB.findOne({
      staffId: staffId,
    });

    if (checkPermission) {
      if (
        checkPermission.notificationPreferences?.supportTickets?.email === true
      ) {
        return true;
      }
    }
  } catch (error) {
    console.error('Error checking merchant notification preference:', error);
  }

  return false; // Return false if no preferences or if email notifications are not enabled
};

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
