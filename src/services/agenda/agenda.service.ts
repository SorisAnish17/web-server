import { Injectable } from '@nestjs/common';
import { Agenda } from 'agenda';
import { EmailDetailsDto } from '../../core/dto/email/index';
import { scheduleJob } from './use-cases/schedule-job';
import { cancelJob } from './use-cases/cancel-job';
import { defineJob } from './use-cases/define-job';

@Injectable()
export class AgendaService {
  private agenda: Agenda;

  public readonly scheduleJob: (
    emailDetails: EmailDetailsDto,
    time?: string,
  ) => Promise<void>;

  public readonly cancelJob: (
    userId: string,
    messageId: string,
  ) => Promise<void>;

  public readonly defineJob: (
    name: string,
    jobHandler: (job: any) => Promise<void>,
  ) => Promise<void>;

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

    // Initialize readonly properties
    this.scheduleJob = scheduleJob(this.agenda);
    this.cancelJob = cancelJob(this.agenda);
    this.defineJob = defineJob(this.agenda);

    this.agenda.on('error', (error) => {
      console.error('Agenda connection error:', error);
    });
  }

  async start() {
    await this.agenda.start();
    console.log('Agenda started');
  }

  public getAgenda(): Agenda {
    return this.agenda;
  }
}
