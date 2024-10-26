import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatEventCollection } from '../../../libs/database/collections/chat-event/chat-event';
import { CreateChatMessageDto } from 'src/core/dto/chat-event';
import { getParticipantsByChatRoomId } from './get-participants'; // Step 1
import { checkInternalAdminStaffs } from './check-internal-admin-staff'; // Step 3
import { DatabaseClientService } from '../../../libs/database/index.service';

export const sendMessage = (
  chatRoomsCollection: ChatEventCollection,
  databaseClientService: DatabaseClientService,
) => {
  return async (
    messageData: CreateChatMessageDto,
  ): Promise<CreateChatMessageDto> => {
    try {
      await getParticipantsByChatRoomId(
        databaseClientService, // Pass the instance here
        messageData.chatRoomId,
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
