import { Injectable } from '@nestjs/common';
import { Agenda } from 'agenda';

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
}
