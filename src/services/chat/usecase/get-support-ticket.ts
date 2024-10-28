import { Collection, ObjectId } from 'mongodb';
import { dbCollectionNames } from '../../../libs/database/db-connections';
import { DatabaseClientService } from '../../../libs/database/index.service';
import { handleError } from './handle-error';
import { HttpStatus } from '@nestjs/common';

export async function getSupportTicket(
  databaseClientService: DatabaseClientService,
  ticketId: string,
) {
  try {
    // Get the support tickets collection
    const ticketCollection: Collection =
      await databaseClientService.getDBCollection(
        dbCollectionNames.support_tickets,
      );

    // Convert the ticket ID to ObjectId format
    const ticketIdObjectId = new ObjectId(ticketId);

    // Find the ticket by its ID
    const ticket = await ticketCollection.findOne({
      _id: ticketIdObjectId,
    });

    // If the ticket is not found, throw an error
    if (!ticket) {
      handleError('Support ticket not found', HttpStatus.NOT_FOUND);
    }

    // Return the found ticket
    return ticket;
  } catch (error) {
    // Handle any errors that occur during retrieval
    handleError('Error retrieving support ticket: ' + error.message);
  }
}
