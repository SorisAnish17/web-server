import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Collection } from 'mongodb';
import { DatabaseClientService } from '../../index.service';
import { dbCollectionNames } from '../../db-connections';
import { ScheduleUnreadMessageDto } from '../../../../core/dto/schedule-unread-messages/index';
import { AgendaProvider } from '../../../../services/agenda/agenda.provider';

@Injectable()
export class ScheduleUnreadMessagesCollection {
  constructor(
    private readonly databaseClientService: DatabaseClientService,
    private readonly agendaProvider: AgendaProvider,
  ) {
    // Define the email sending job
    this.agendaProvider.defineJob('send email', async (job) => {
      const { email, messageId } = job.attrs.data;
      await this.sendEmail(email, messageId);
      await this.deleteMessageFromDB(email);
    });
  }

  private async getCollection(): Promise<Collection> {
    return this.databaseClientService.getDBCollection(
      dbCollectionNames.schedule_unread_messages,
    );
  }

  async storeScheduleUnreadMessages(
    emailDetails: ScheduleUnreadMessageDto,
  ): Promise<string> {
    const connectionDB = await this.getCollection();
    const { email } = emailDetails;

    try {
      const existingMessage = await connectionDB.findOne({ email });

      if (existingMessage) {
        await this.incrementUnreadCount(connectionDB, email);
        return 'Unread message count incremented successfully';
      } else {
        const result = await connectionDB.insertOne(emailDetails);

        if (result.insertedId) {
          await this.scheduleEmailSending(result.insertedId.toString(), email);
          return 'Schedule unread message stored successfully';
        } else {
          throw new Error('Failed to store the unread message');
        }
      }
    } catch (error) {
      console.error('Error while storing unread schedule messages:', error);
      throw new HttpException(
        'Internal server error while storing messages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async incrementUnreadCount(connectionDB: Collection, email: string) {
    const updatedResult = await connectionDB.updateOne(
      { email },
      { $inc: { unreadMessage: 1 } },
    );

    if (updatedResult.modifiedCount === 0) {
      throw new Error('Failed to increment unread message count');
    }
  }

  private async scheduleEmailSending(messageId: string, email: string) {
    // Schedule the job to send the email after 3 minutes
    await this.agendaProvider.scheduleJob('in 1 minutes', 'send email', {
      email,
      messageId,
    });
  }

  private async sendEmail(email: string, messageId: string) {
    console.log(`Sending email to ${email} for message ID ${messageId}`);
  }

  private async deleteMessageFromDB(email: string) {
    try {
      const connectionDB = await this.getCollection();
      const result = await connectionDB.deleteOne({ email });
      if (result.deletedCount === 0) {
        console.warn(`No entry found to delete for ${email}`);
      } else {
        console.log(`Deleted email entry for ${email}`);
      }
    } catch (error) {
      console.error('Error deleting message from DB:', error);
    }
  }
}
