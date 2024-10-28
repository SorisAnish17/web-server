import { ObjectId } from 'mongodb';
import { checkInternalAdminStaffs } from '../../chat/usecase/check-internal-admin-staff';
import { processParticipants } from '../../chat/usecase/process-participants';
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

    // Get active customer socket ID
    const { activeCustomerSocketId, merchantSocketIds } =
      await processParticipants(chatRoomId, databaseClientService);

    // Emit message to the active customer
    if (activeCustomerSocketId) {
      emitToSocket(server, activeCustomerSocketId, 'newMessage', message);
    }

    // Emit message to assigned merchant staff or role-based staff
    if (merchantSocketIds?.length) {
      merchantSocketIds.forEach((socketId) =>
        emitToSocket(server, socketId, 'newMessage', message),
      );
    } else {
      console.log(
        `No active merchant staff found for chatRoomId: ${chatRoomId}`,
      );
    }

    // Get admin socket IDs
    const adminSocketIds = await checkInternalAdminStaffs(
      databaseClientService,
      chatRoomId,
    );

    console.log('adminSocketIds:', adminSocketIds);

    // Emit message to active admin staff
    if (adminSocketIds?.length) {
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
    console.log(`Emitting message to socketId: ${socketId}`);
    server.to(socketId).emit(event, message);
  }
};
