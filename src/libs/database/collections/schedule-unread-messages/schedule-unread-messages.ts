import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import { DatabaseClientService } from '../../index.service';
import { dbCollectionNames } from '../../db-connections';
import { ScheduleUnreadMessageDto } from '../../../../core/dto/schedule-unread-messages/index';
import { AgendaProvider } from '../../../../services/agenda/agenda.provider';
import { sendEmail } from '../../../../services/agenda/use-cases/send-email';
import { removeEmailByEmail } from '../../../../services/agenda/use-cases/remove-email';

@Injectable()
export class ScheduleUnreadMessagesCollection implements OnModuleInit {
  constructor(
    private readonly databaseClientService: DatabaseClientService,
    private readonly agendaProvider: AgendaProvider,
  ) {}

  async onModuleInit() {
    await this.initializeJobs();
  }

  private async initializeJobs() {
    // Define the email sending job
    this.agendaProvider.defineJob('send email', async (job) => {
      const { emailDetails } = job.attrs.data;
      await sendEmail(emailDetails);
      await removeEmailByEmail(emailDetails.email);
    });
  }

  private async getCollection(): Promise<Collection> {
    return this.databaseClientService.getDBCollection(
      dbCollectionNames.schedule_unread_messages,
    );
  }

  async createScheduleUnreadMessages(
    emailDetails: ScheduleUnreadMessageDto,
  ): Promise<string> {
    const connectionDB = await this.getCollection();
    const { email, message, name, userId, messageId } = emailDetails;
    try {
      const existingMessage = await connectionDB.findOne({ email });

      if (existingMessage) {
        await this.incrementUnreadCount(connectionDB, email);
        return 'Unread message count incremented successfully';
      } else {
        const result = await connectionDB.insertOne(emailDetails);

        if (result.insertedId) {
          const jobEmailDetails = {
            messageId,
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
    messageId: ObjectId;
    name: string;
    email: string;
    message: string | File;
    userId: ObjectId;
  }) {
    await this.agendaProvider.scheduleJob('in 1 minute', 'send email', {
      emailDetails,
      userId: emailDetails.userId,
      messageId: emailDetails.messageId,
    });
  }
}
