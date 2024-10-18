import { Injectable } from '@nestjs/common';
import { Agenda } from 'agenda';
import { ObjectId } from 'mongodb';

@Injectable()
export class AgendaProvider {
  private agenda: Agenda;

  constructor() {
    this.agenda = new Agenda({
      db: {
        address: process.env.MONGODB_URI,
      },
    });

    this.agenda.on('ready', async () => {
      await this.agenda.start();
    });
  }

  public getAgenda(): Agenda {
    return this.agenda;
  }

  public async defineJob(
    name: string,
    jobHandler: (job: any) => Promise<void>,
  ) {
    this.agenda.define(name, jobHandler);
  }

  public async scheduleJob(time: string, jobName: string, data: any) {
    await this.agenda.schedule(time, jobName, data);
  }

  public async cancelJob(userId: string) {
    try {
      const cancelledCount = await this.agenda.cancel({
        'data.userId': new ObjectId(userId), // Convert userId to ObjectId
      });
      console.log('Cancelled jobs count:', cancelledCount);
      if (cancelledCount > 0) {
        console.log(`Cancelled job for user ID: ${userId}`);
      } else {
        console.log(`No job found for user ID: ${userId}`);
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  }
}
