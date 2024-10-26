import { ObjectId } from 'mongodb';
import { checkInternalAdminStaffs } from '../../chat/usecase/check-internal-admin-staff';
import { getMerchantInfo } from '../../chat/usecase/get-merchant-info';
import { getChatRoomDetails } from '../use-cases/get-chat-room-details';
import { getParticipantsByChatRoomId } from '../../chat/usecase/get-participants';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { handleError } from '../use-cases/handle-error';

enum BodyType {
  File = 'File',
  Text = 'Text',
}

enum MessageType {
  Event = 'Event',
  Message = 'Message',
}

interface BodyDto {
  type: BodyType;
  content: string;
}

interface SenderDto {
  _id: ObjectId;
  type: string;
}

interface ReadByDto {
  userId: ObjectId;
  type: string;
  timestamp: string;
}

interface Message {
  _id?: ObjectId; // Change this line to use ObjectId
  chatRoomId: string;
  type: MessageType;
  body: BodyDto;
  readBy: ReadByDto[];
  deleted: boolean;
  sender: SenderDto;
}

export const emitMessageToParticipants = async (
  chatRoomId: string,
  message: Message,
  server: any,
) => {
  try {
    const databaseClientService = new DatabaseClientService();

    // Step 1: Get active customers and merchants
    const { activeCustomerSocketId, customers } =
      await getParticipantsByChatRoomId(databaseClientService, chatRoomId);

    console.log('activeCustomerSocketId ', activeCustomerSocketId);

    // Step 2: Emit message to the active customer
    if (activeCustomerSocketId) {
      emitToSocket(server, activeCustomerSocketId, 'newMessage', message);
    }

    // Step 3: Emit message to all customers in the room
    customers.forEach((customer) => {
      emitToSocket(server, customer.socketId, 'newMessage', message);
    });

    // Step 4: Fetch organisationId and outletId from chatRoom details
    const chatRoomDetails = await getChatRoomDetails(chatRoomId);

    if (!chatRoomDetails) {
      console.error(
        `No merchant participants found for chatRoomId: ${chatRoomId}`,
      );
    } else {
      const { organisationId, outletId } = chatRoomDetails;

      if (organisationId || outletId) {
        const merchantStaffSocketIds = await getMerchantInfo(
          organisationId,
          outletId,
          chatRoomId,
          databaseClientService,
        );

        console.log('mechantStaff', merchantStaffSocketIds);
        // Step 6: Emit message to assigned merchant staff or role-based staff
        if (merchantStaffSocketIds && merchantStaffSocketIds.length > 0) {
          merchantStaffSocketIds.forEach((socketId) =>
            emitToSocket(server, socketId, 'newMessage', message),
          );
        } else {
          console.log(
            `No active merchant staff found for chatRoomId: ${chatRoomId}`,
          );
        }
      }
    }

    // Step 5: Get admin socket IDs
    const adminSocketIds = await checkInternalAdminStaffs(
      databaseClientService,
      chatRoomId,
    );

    console.log('adminSocketIds:', adminSocketIds);

    // Step 8: Emit message to active admin staff
    if (adminSocketIds && adminSocketIds.length > 0) {
      adminSocketIds.forEach((socketId) =>
        emitToSocket(server, socketId, 'newMessage', message),
      );
    } else {
      console.log(`No active admin staff found for chatRoomId: ${chatRoomId}`);
    }
  } catch (error) {
    // Centralized error handling
    handleError('Error emitting message to room participants', error);
  }
};

const emitToSocket = (
  server: any,
  socketId: string,
  event: string,
  message: Message,
) => {
  if (socketId) {
    console.log(`Emitting message to socketId: ${socketId} `);
    server.to(socketId).emit(event, message);
  }
};
