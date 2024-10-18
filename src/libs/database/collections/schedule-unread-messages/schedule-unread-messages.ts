import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../index.service';
import { dbCollectionNames } from '../../db-connections';
import { ScheduleUnreadMessageDto } from '../../../../core/dto/schedule-unread-messages/index';
import { AgendaProvider } from '../../../../services/agenda/agenda.provider';
import { EmailClientService } from '../../../email-delivery-client/email-delivery.service';

@Injectable()
export class ScheduleUnreadMessagesCollection {
  constructor(
    private readonly databaseClientService: DatabaseClientService,
    private readonly agendaProvider: AgendaProvider,
    private readonly emailClientService: EmailClientService,
  ) {
    // Define the email sending job
    this.agendaProvider.defineJob('send email', async (job) => {
      const { emailDetails } = job.attrs.data;
      await this.sendEmail(emailDetails);
      await this.deleteMessageFromDB(emailDetails.email);
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
    const { email, message, name, userId } = emailDetails;

    try {
      const existingMessage = await connectionDB.findOne({ email });

      if (existingMessage) {
        await this.incrementUnreadCount(connectionDB, email);
        return 'Unread message count incremented successfully';
      } else {
        const result = await connectionDB.insertOne(emailDetails);

        if (result.insertedId) {
          const jobEmailDetails = {
            messageId: result.insertedId.toString(),
            email,
            name,
            message,
            userId,
          };
          await this.scheduleEmailSending(jobEmailDetails);
          return 'Scheduled unread message stored successfully';
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

  private async scheduleEmailSending(emailDetails: {
    messageId: string;
    name: string;
    email: string;
    message: string | File;
    userId: ObjectId;
  }) {
    console.log('Scheduling job for userId:', emailDetails.userId); // Log userId
    await this.agendaProvider.scheduleJob('in 1 minute', 'send email', {
      emailDetails,
      userId: emailDetails.userId, // Ensure this is passed correctly
    });
  }

  private async sendEmail(emailDetails: {
    messageId: string;
    name: string;
    email: string;
    message: string | File;
  }) {
    await this.emailClientService.sendEmail(emailDetails);
  }

  private async deleteMessageFromDB(email: string) {
    console.log('Deleting email from DB:', email);
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
