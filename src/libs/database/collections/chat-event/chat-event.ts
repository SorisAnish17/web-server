import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseClientService } from '../../index.service';
import { Collection, ObjectId } from 'mongodb';
import { dbCollectionNames } from '../../db-connections';
import {
  CreateChatMessageDto,
  ReadByDto,
} from '../../../../core/dto/chat-event/index';
import { dbUtils } from '../../utils';
import { ScheduleUnreadMessagesCollection } from '../schedule-unread-messages/schedule-unread-messages';
import { AgendaProvider } from '../../../../services/agenda/agenda.provider';

type CollectionNames = keyof typeof dbCollectionNames;

@Injectable()
export class ChatEventCollection {
  constructor(
    private readonly databaseClientService: DatabaseClientService,
    private readonly scheduleUnreadMessagesCollection: ScheduleUnreadMessagesCollection,
    private readonly agendaProvider: AgendaProvider,
  ) {}

  private async getCollection(
    collectionName: CollectionNames,
  ): Promise<Collection> {
    return await this.databaseClientService.getDBCollection(collectionName);
  }

  private handleError(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ): never {
    throw new HttpException(message, status);
  }

  async getParticipantsByChatRoomId(chatRoomId: string) {
    try {
      const filterRoom = await this.fetchChatRoom(chatRoomId);
      const activeUsersMap = await this.getActiveUsersMap();

      const { activeCustomerSocketId, organisationIds } =
        await this.processParticipants(
          filterRoom.participants,
          activeUsersMap,
          chatRoomId,
        );

      if (activeCustomerSocketId) {
        console.log(
          `activeCustomerId: ${activeCustomerSocketId} and chatroomId:${chatRoomId}`,
        );
      }

      const customersInfo = await this.getCustomerInfo(organisationIds);

      return {
        activeCustomerSocketId,
        customers: customersInfo,
      };
    } catch (error) {
      this.handleError(error.message);
    }
  }

  async processParticipants(participants, activeUsersMap, chatRoomId) {
    const organisationIds: string[] = [];
    let activeCustomerSocketId = null;

    await Promise.all(
      participants.map(async (participant) => {
        if (participant.type === 'customer') {
          organisationIds.push(participant.organisationId);

          const onlineUser = activeUsersMap.get(
            participant.organisationId.toString(),
          );
          if (onlineUser) {
            activeCustomerSocketId = onlineUser.socketId;
          }
        } else if (participant.type === 'merchant') {
          await this.handleMerchantParticipant(participant, chatRoomId);
        }
      }),
    );

    return { activeCustomerSocketId, organisationIds };
  }

  async handleMerchantParticipant(participant, chatRoomId) {
    const { organisationId, outletId } = participant;
    await this.getMerchantInfo(organisationId, outletId, chatRoomId);
  }

  async fetchChatRoom(chatRoomId: string) {
    const chatRoomCollection = await this.getCollection(
      dbCollectionNames.chat_rooms,
    );
    const chatRoomIdObjectId = dbUtils.convertToObjectId(chatRoomId);

    const filterRoom = await chatRoomCollection.findOne({
      referenceId: chatRoomIdObjectId,
    });

    if (!filterRoom) {
      this.handleError('Chat room not found', HttpStatus.NOT_FOUND);
    }

    return filterRoom;
  }

  async getActiveUsersMap() {
    const onlineActivityCollection = await this.getCollection(
      dbCollectionNames.online_activity,
    );
    const activeUsersData = await onlineActivityCollection
      .find({ status: 'online' })
      .toArray();

    return new Map(
      activeUsersData.map((user) => [user.userId.toString(), user]),
    );
  }

  async getCustomerInfo(organisationIds: string[]) {
    try {
      const customersCollection = await this.getCollection(
        dbCollectionNames.customers,
      );
      const customers = await customersCollection
        .find({ _id: { $in: organisationIds.map((id) => new ObjectId(id)) } })
        .toArray();

      if (customers.length === 0) {
        this.handleError('No customers found', HttpStatus.NOT_FOUND);
      }

      return customers;
    } catch (error) {
      this.handleError('Error retrieving customers: ' + error.message);
    }
  }

  async getMerchantInfo(
    organisationId: string,
    outletId: string,
    chatRoomId: string,
  ): Promise<string[]> {
    // Initialize an empty array to hold socket IDs
    let merchantSocketIds: string[] = [];

    // Retrieve the ticket from the collection
    const ticketCollection = await this.getCollection(
      dbCollectionNames.support_tickets,
    );
    const ticket = await ticketCollection.findOne({
      _id: new ObjectId(chatRoomId),
    });

    // 1. Check if the ticket is assigned to a specific merchant staff
    if (ticket?.assignedToMerchantStaff) {
      const assignedMerchantStaffId = ticket.assignedToMerchantStaff._id;
      const activeUsersMap = await this.getActiveUsersMap();

      // 2. Check if the assigned staff is currently active
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

    // 3. If no assigned merchant staff, fall back to role-based staff
    if (merchantSocketIds.length === 0) {
      console.log(
        `No active assigned merchant staff for chatRoomId: ${chatRoomId}. Checking role-based staff.`,
      );

      const { activeStaffs } = await this.checkMerchantRoleAndStatus(
        organisationId,
        outletId,
      );

      // 4. If there are active role-based staff members, add their socket IDs to the array
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

    // 5. Log if no active staff were found
    if (merchantSocketIds.length === 0) {
      console.log(
        `No active merchant staff found for organisationId: ${organisationId}, outletId: ${outletId}`,
      );
    }

    // 6. Return the array (empty if no staff found)
    return merchantSocketIds;
  }

  async getMerchantStaffInfo(assignedMerchantStaffId: ObjectId) {
    const staffCollection = await this.getCollection(
      dbCollectionNames.merchants_staff,
    );
    const staffDetails = await staffCollection.findOne({
      _id: new ObjectId(assignedMerchantStaffId),
    });
    return staffDetails;
  }

  async checkMerchantRoleAndStatus(organisationId: string, outletId: string) {
    try {
      const rolesCollection = await this.getCollection(
        dbCollectionNames.merchants_roles_and_permissions,
      );
      const staffCollection = await this.getCollection(
        dbCollectionNames.merchants_staff,
      );

      // Fetch roles and permissions for the organization
      const rolesAndPermissions = await rolesCollection
        .find({ merchantId: new ObjectId(organisationId) })
        .toArray();

      // Filter roles that have access to support and chat
      const filteredRoles = rolesAndPermissions
        .filter(
          (role) =>
            role.permissions.support.canAccess === true &&
            role.permissions.support.chat === true,
        )
        .map((role) => role.role);

      // Fetch staff members who belong to the filtered roles and selected outlet
      const staffMembers = await staffCollection
        .find({ selectedOutlet: outletId, role: { $in: filteredRoles } })
        .toArray();

      // Get active users from online activity
      const activeUsersMap = await this.getActiveUsersMap();

      // Filter out active staff members
      const activeStaffs = staffMembers
        .filter((staff) => activeUsersMap.has(staff._id.toString()))
        .map((staff) => ({
          userId: staff._id,
          socketId: activeUsersMap.get(staff._id.toString())?.socketId || null,
        }));

      return { activeStaffs, staffMembers };
    } catch (error) {
      this.handleError('Error fetching roles and permissions', error.message);
    }
  }

  //scheduler
  async getChatRoomCollectionParticipate(chatRoomIdObjectId: ObjectId) {
    const chatRoomCollection = await this.getCollection(
      dbCollectionNames.chat_rooms,
    );
    const chatRoom = await chatRoomCollection.findOne({
      referenceId: chatRoomIdObjectId,
    });
    const { participants } = chatRoom;

    return { participants, chatRoom };
  }

  async getCustomerDetails(customerOrganisationId: ObjectId) {
    const customersCollection = await this.getCollection(
      dbCollectionNames.customers,
    );
    const customerDts = await customersCollection.findOne({
      _id: customerOrganisationId,
    });

    const { firstName, lastName, email, _id: userId } = customerDts;

    return { firstName, lastName, email, userId };
  }

  async checkMerchantNotificationPreference(
    staffId: ObjectId,
  ): Promise<boolean> {
    try {
      const connectionDB = await this.getCollection(
        dbCollectionNames.merchants_staff_settings,
      );

      const checkPermission = await connectionDB.findOne({
        staffId: staffId,
      });

      if (checkPermission) {
        if (
          checkPermission.notificationPreferences?.supportTickets?.email ===
          true
        ) {
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking merchant notification preference:', error);
    }

    return false; // Return false if no preferences or if email notifications are not enabled
  }

  async checkInternalAdminStaffs(chatRoomId: string) {
    const activeSocketIds = [];

    try {
      const connectionDb = await this.getCollection(
        dbCollectionNames._internal_admins,
      );
      const ticket = await this.getSupportTicket(chatRoomId);

      if (ticket?.assignedToAdminStaff) {
        const { _id: adminId } = ticket.assignedToAdminStaff;
        await connectionDb.findOne({
          _id: adminId,
        });

        const activeUsersMap = await this.getActiveUsersMap();
        const socketId = activeUsersMap.get(adminId.toString())?.socketId;

        if (socketId) {
          activeSocketIds.push(socketId);
        }
      } else {
        const connectionDB = await this.getCollection(
          dbCollectionNames._internal_admins_roles_and_permissions,
        );

        const rolesAndPermissions = await connectionDB
          .find({
            'permissions.support.canAccess': true,
            'permissions.support.chat': true,
          })
          .toArray();

        const roles = rolesAndPermissions.map((role) => role.role);

        // Use the $in operator to retrieve internal admin staff with matching roles
        const matchingAdminStaffs = await connectionDb
          .find({ role: { $in: roles } })
          .toArray();

        // Fetch active users
        const activeUsersMap = await this.getActiveUsersMap();

        // Check each matching admin staff for their socketId
        matchingAdminStaffs.forEach((staff) => {
          const socketId = activeUsersMap.get(staff._id.toString())?.socketId;
          if (socketId) {
            activeSocketIds.push(socketId); // Add to the array if found
          }
          return { ...staff, socketId };
          // If you need to keep the staff with socketId for further use, consider storing it somewhere
          // e.g., updatedStaffs.push({ ...staff, socketId });
        });
      }
    } catch (error) {
      console.log('Error on fetching the internal admin staff', error.message);
    }

    return activeSocketIds; // Return the array of active socket IDs
  }

  async getSupportTicket(ticketId: string) {
    try {
      const ticketCollection = await this.getCollection(
        dbCollectionNames.support_tickets,
      );
      const ticketIdObjectId = dbUtils.convertToObjectId(ticketId);

      const ticket = await ticketCollection.findOne({
        _id: ticketIdObjectId,
      });

      if (!ticket) {
        this.handleError('Support ticket not found', HttpStatus.NOT_FOUND);
      }

      return ticket;
    } catch (error) {
      this.handleError('Error retrieving support ticket: ' + error.message);
    }
  }

  async sendMessage(
    messageData: CreateChatMessageDto,
  ): Promise<CreateChatMessageDto> {
    try {
      const chatRoomIdObjectId = dbUtils.convertToObjectId(
        messageData.chatRoomId,
      );

      // Check participants in the chat room
      await this.getParticipantsByChatRoomId(messageData.chatRoomId);

      const chatEventCollection = await this.getCollection(
        dbCollectionNames.chat_events,
      );

      // Insert the message into the chat events collection
      const result = await chatEventCollection.insertOne({
        ...messageData,
        chatRoomId: chatRoomIdObjectId,
      });

      // Check if the insertion was successful
      if (result.insertedId) {
        // Schedule any additional tasks related to the message

        // Check internal admin staff for the chat room
        await this.checkInternalAdminStaffs(messageData.chatRoomId);

        await this.scheduler(messageData, result.insertedId);

        // Return the message data with insertedId
        return {
          ...messageData,
          _id: result.insertedId, // Keep it as ObjectId
        };
      } else {
        this.handleError(
          'Failed to create message',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.handleError(
        error.message || 'An error occurred while sending the message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMessages(chatRoomId: string) {
    try {
      const connectionDB = await this.getCollection(
        dbCollectionNames.chat_events,
      );
      const chatRoomIdObjectId = dbUtils.convertToObjectId(chatRoomId);

      const messages = await connectionDB
        .find({
          chatRoomId: chatRoomIdObjectId,
        })
        .toArray();
      return messages;
    } catch (error) {
      console.error('Error in getting message:', error.message);
    }
  }

  async viewMessage(userId: string, messageId: string) {
    try {
      const connectionDB = await this.getCollection(
        dbCollectionNames.chat_events,
      );
      const messageIdObject = dbUtils.convertToObjectId(messageId); // Keep this as ObjectId

      // Find the message to update
      const message = (await connectionDB.findOne({
        _id: messageIdObject,
      })) as CreateChatMessageDto;

      if (!message) {
        console.error('Message not found');
        return {
          success: false,
          message: 'Message not found',
        };
      }

      // Check if the user is the sender
      if (message.sender._id.toString() === userId) {
        return {
          success: true,
          message: 'Sender does not need to view their own message',
        };
      }

      // Check if the user has already viewed the message
      if (
        message.readBy?.some((entry) =>
          entry.userId.equals(dbUtils.convertToObjectId(userId)),
        )
      ) {
        return {
          success: true,
          message: 'Message already viewed',
        };
      }

      // Initialize readBy array if it doesn't exist
      if (!message.readBy) {
        message.readBy = [];
      }

      // Create a new ReadByDto object and add userId as ObjectId to readBy array
      const newReadByEntry = {
        userId: dbUtils.convertToObjectId(userId), // Convert userId to ObjectId
        type: 'viewer', // Replace with appropriate type if needed
        timestamp: new Date().toISOString(), // Format timestamp as needed
      } as ReadByDto;

      // Update the message and readBy array
      message.readBy.push(newReadByEntry);
      await connectionDB.updateOne(
        { _id: messageIdObject },
        { $set: { readBy: message.readBy, updatedAt: new Date() } },
      );

      // Cancel the scheduled job before removing the user from the scheduler
      await this.removeUserFromScheduler(userId);

      return {
        success: true,
        message: 'Message viewed successfully',
      };
    } catch (error) {
      console.error('Error on view message:', error.message);
      return {
        success: false,
        message: 'Error viewing message',
      };
    }
  }

  // Method to remove the user from the scheduler
  async removeUserFromScheduler(userId: string) {
    const connectionDB = await this.getCollection(
      dbCollectionNames.schedule_unread_messages,
    );
    const userObjectId = dbUtils.convertToObjectId(userId);

    // Find the user entry in the scheduler
    const findUser = await connectionDB.findOne({ userId: userObjectId });

    if (findUser) {
      // Cancel the scheduled job for this user
      await this.agendaProvider.cancelJob(userId); // Cancel the job using the userId

      // If the user is found, remove their entry from the collection
      const result = await connectionDB.deleteOne({ userId: userObjectId });

      if (result.deletedCount > 0) {
        console.log(`User with ID ${userObjectId} removed from scheduler.`);
        return {
          success: true,
          message: 'User removed from scheduler successfully.',
        };
      } else {
        console.error('User removal failed, no documents deleted.');
        return {
          success: false,
          message: 'User removal failed.',
        };
      }
    } else {
      console.warn('User not found in scheduler.');
      return {
        success: false,
        message: 'User not found in scheduler.',
      };
    }
  }

  async scheduler(messageData: CreateChatMessageDto, messageId: ObjectId) {
    try {
      const chatRoomIdObjectId = dbUtils.convertToObjectId(
        messageData.chatRoomId,
      );
      const senderId = dbUtils.convertToObjectId(messageData.sender._id);

      // Fetch participants from the chat room
      const { participants } =
        await this.getChatRoomCollectionParticipate(chatRoomIdObjectId);

      // Get customer and merchant participants
      const customer =
        participants.find((participant) => participant.type === 'customer') ||
        null;
      const merchant =
        participants.find((participant) => participant.type === 'merchant') ||
        null;

      // Handle customer notifications
      if (customer) {
        await this.processCustomerNotification(
          customer,
          senderId,
          messageData,
          messageId,
        );
      } else {
        console.log('No customer found.');
      }

      // Handle merchant notifications
      if (merchant) {
        await this.processMerchantNotification(
          merchant,
          senderId,
          messageData,
          messageId,
          chatRoomIdObjectId,
        );
      } else {
        console.log('No merchant found.');
      }
    } catch (error) {
      this.handleError('Error in scheduler function: ' + error.message);
    }
  }

  async processCustomerNotification(
    customer: { organisationId: ObjectId; type: string },
    senderId: ObjectId,
    messageData: CreateChatMessageDto,
    messageId: ObjectId,
  ) {
    const customerOrganisationId = dbUtils.convertToObjectId(
      customer.organisationId,
    );

    // Skip notification if the sender is the customer
    if (customerOrganisationId.equals(senderId)) {
      console.log('Sender is the customer, skipping notification.');
      return;
    }

    // Retrieve customer details and send notification
    const customerDetails = await this.getCustomerDetails(
      customer.organisationId,
    );
    const { email, firstName, lastName, userId } = customerDetails;
    const name = `${firstName} ${lastName}`;

    const emailDetails = {
      email,
      name,
      userId,
      messageId,
      message: messageData.body.content,
    };

    await this.agenda(emailDetails);
  }

  async processMerchantNotification(
    merchant: { organisationId: string; outletId: string; type: string },
    senderId: ObjectId,
    messageData: CreateChatMessageDto,
    messageId: ObjectId,
    chatRoomIdObjectId: ObjectId,
  ) {
    const ticketCollection = await this.getCollection(
      dbCollectionNames.support_tickets,
    );
    const ticket = await ticketCollection.findOne({ _id: chatRoomIdObjectId });

    if (ticket?.assignedToMerchantStaff) {
      await this.handleAssignedMerchantStaffNotification(
        ticket,
        senderId,
        messageData,
        messageId,
      );
    } else {
      console.log('Ticket is not assigned to any merchant staff.');
      await this.notifyAllMerchantStaff(
        merchant,
        senderId,
        messageData,
        messageId,
      );
    }
  }

  async handleAssignedMerchantStaffNotification(
    ticket,
    senderId,
    messageData,
    messageId,
  ) {
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
    const staffDetails = await this.getMerchantStaffInfo(
      assignedMerchantStaffId,
    );
    if (staffDetails) {
      const notificationEnabled =
        await this.checkMerchantNotificationPreference(staffDetails._id);
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
        await this.agenda(emailDetails);
      } else {
        console.log(
          'Notification not enabled for the assigned merchant staff.',
        );
      }
    } else {
      console.log('No assigned merchant staff found.');
    }
  }

  async notifyAllMerchantStaff(merchant, senderId, messageData, messageId) {
    const { organisationId, outletId } = merchant;
    const { staffMembers } = await this.checkMerchantRoleAndStatus(
      organisationId,
      outletId,
    );

    await Promise.all(
      staffMembers.map(async (staff) => {
        const staffDetails = await this.getMerchantStaffInfo(staff._id);
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

          await this.agenda(emailDetails);
        }
      }),
    );
  }

  async agenda(emailData: {
    email: string;
    messageId: ObjectId;
    message: string | File;
    name: string;
    userId: ObjectId;
  }) {
    try {
      await this.scheduleUnreadMessagesCollection.storeScheduleUnreadMessages(
        emailData,
      );

      return { success: true, message: 'Message scheduled successfully.' };
    } catch (error) {
      console.error('Error in agenda function:', error.message);
      return { success: false, message: 'Failed to schedule the message.' };
    }
  }
}
