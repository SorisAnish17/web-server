import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseClientService } from '../../index.service';
import { Collection, ObjectId } from 'mongodb';
import { dbCollectionNames } from '../../db-connections';
import { CreateChatMessageDto } from '../../../../core/dto/chat-event/index';
import { dbUtils } from '../../utils';

type CollectionNames = keyof typeof dbCollectionNames;

@Injectable()
export class ChatEventCollection {
  constructor(private readonly databaseClientService: DatabaseClientService) {}

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

  async getParticipantsByChatRoomId(chatRoomId: string, server: any) {
    try {
      const filterRoom = await this.fetchChatRoom(chatRoomId);
      const activeUsersMap = await this.getActiveUsersMap();

      const { activeCustomerSocketId, organisationIds } =
        await this.processParticipants(
          filterRoom.participants,
          activeUsersMap,
          chatRoomId,
          server, // Pass the socket server instance
        );

      if (activeCustomerSocketId) {
        console.log(
          `activeCustomerId: ${activeCustomerSocketId} and chatroomId:${chatRoomId}`,
        );
        server.to(activeCustomerSocketId).emit('joinTicket', {
          chatRoomId: chatRoomId,
        });
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

  async processParticipants(participants, activeUsersMap, chatRoomId, server) {
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
          await this.handleMerchantParticipant(participant, chatRoomId, server);
        }
      }),
    );

    return { activeCustomerSocketId, organisationIds };
  }

  async handleMerchantParticipant(participant, chatRoomId, server) {
    const { organisationId, outletId } = participant;
    await this.getMerchantInfo(
      organisationId,
      outletId,
      chatRoomId,
      server, // Pass the socket server instance
    );
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
    server: any, // Include the socket server to emit events
  ) {
    const ticketCollection = await this.getCollection(
      dbCollectionNames.support_tickets,
    );
    const ticket = await ticketCollection.findOne({
      _id: new ObjectId(chatRoomId),
    });

    if (ticket?.assignedToMerchantStaff) {
      // If the ticket is assigned to a merchant staff, join the assigned merchant staff
      const assignedMerchantStaffId = ticket.assignedToMerchantStaff._id;
      const activeUsersMap = await this.getActiveUsersMap();

      if (activeUsersMap.has(assignedMerchantStaffId.toString())) {
        const assignedMerchantSocketId = activeUsersMap.get(
          assignedMerchantStaffId.toString(),
        )?.socketId;

        if (assignedMerchantSocketId) {
          console.log(
            `assignedToMerchantStaffSocketId:${assignedMerchantSocketId} and chatRoomid :${chatRoomId}`,
          );
          // Emit 'joinRoom' event to the assigned merchant staff socket
          server.to(assignedMerchantSocketId).emit('joinTicket', {
            chatRoomId: chatRoomId,
          });
        }

        await this.getMerchantStaffInfo(assignedMerchantStaffId);
        return assignedMerchantSocketId;
      }

      console.log('Assigned merchant staff is not active.');
      return null;
    } else {
      // If no assigned staff, check the merchant roles and permissions
      const selectedStaff = await this.checkMerchantRoleAndStatus(
        organisationId,
        outletId,
      );

      // If there are active staff, join them to the room
      if (selectedStaff.length > 0) {
        selectedStaff.forEach((staff) => {
          if (staff.socketId) {
            console.log(
              `merchant-staff socketId:${staff.socketId} and chatRoomId:${chatRoomId}`,
            );
            // Emit 'joinRoom' event to the selected active merchant staff
            server.to(staff.socketId).emit('joinTicket', {
              chatRoomId: chatRoomId,
            });
          }
        });

        return selectedStaff.map((staff) => staff.socketId);
      }

      console.log('No assigned merchant staff and no active staff found.');
      return null;
    }
  }

  async getMerchantStaffInfo(assignedMerchantStaffId: string) {
    const staffCollection = await this.getCollection(
      dbCollectionNames.merchants_staff,
    );
    const staffDetails = await staffCollection.findOne({
      _id: new ObjectId(assignedMerchantStaffId),
    });
    console.log('staffDetails', staffDetails);
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

      return activeStaffs;
    } catch (error) {
      this.handleError('Error fetching roles and permissions', error.message);
    }
  }

  async sendMessage(messageData: CreateChatMessageDto, server: any) {
    try {
      const chatRoomIdObjectId = dbUtils.convertToObjectId(
        messageData.chatRoomId,
      );

      await this.getParticipantsByChatRoomId(messageData.chatRoomId, server);

      const chatEventCollection = await this.getCollection(
        dbCollectionNames.chat_events,
      );

      const result = await chatEventCollection.insertOne({
        ...messageData,
        chatRoomId: chatRoomIdObjectId,
      });

      if (result.insertedId) {
        // Emit the message to all participants in the chat room
        server.to(messageData.chatRoomId).emit('newMessage', {
          messageId: result.insertedId.toString(),
          ...messageData,
        });
        return { messageId: result.insertedId.toString() };
      } else {
        this.handleError(
          'Failed to create message',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.handleError(error.message);
    }
  }
}
