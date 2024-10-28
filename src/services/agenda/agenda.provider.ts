import { Injectable } from '@nestjs/common';
import { Agenda } from 'agenda';
import { ObjectId } from 'mongodb';

@Injectable()
export class AgendaProvider {
  private agenda: Agenda;

  constructor() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }

    this.agenda = new Agenda({
      db: {
        address: mongoUri,
      },
    });

    this.agenda.on('error', (error) => {
      console.error('Agenda connection error:', error);
    });

    this.agenda.on('ready', async () => {
      try {
        await this.agenda.start();
        console.log('Agenda started successfully.');
      } catch (error) {
        console.error('Error starting Agenda:', error);
      }
    });
  }

  public getAgenda(): Agenda {
    return this.agenda;
  }

  public async defineJob(
    name: string,
    jobHandler: (job: any) => Promise<void>,
  ) {
    this.agenda.define(name, async (job) => {
      try {
        await jobHandler(job);
      } catch (error) {
        console.error(`Error executing job "${name}":`, error);
      }
    });
  }

  public async scheduleJob(time: string, jobName: string, data: any) {
    try {
      await this.agenda.schedule(time, jobName, data);
      console.log(`Successfully scheduled job "${jobName}" at ${time}`);
    } catch (error) {
      console.error('Error scheduling job:', error);
    }
  }

  public async cancelJob(userId: string, messageId: string) {
    try {
      if (!ObjectId.isValid(userId) || !ObjectId.isValid(messageId)) {
        console.error('Invalid ObjectId format for userId or messageId');
        return;
      }

      const userIdObject = new ObjectId(userId);
      const messageIdObject = new ObjectId(messageId);

      const cancelledCount = await this.agenda.cancel({
        'data.userId': userIdObject,
        'data.messageId': messageIdObject,
      });

      console.log('Cancelled jobs count:', cancelledCount);
      if (cancelledCount > 0) {
        console.log(
          `Cancelled job for user ID: ${userId} and message ID: ${messageId}`,
        );
      } else {
        console.log(
          `No job found for user ID: ${userId} and message ID: ${messageId}`,
        );
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  }
}
