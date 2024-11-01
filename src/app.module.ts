import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppRoutesModule } from './app-routes.module';
import { AgendaModule } from './services/agenda/agenda.module';
import { EmailClientModule } from './libs/email-delivery-client/email-delivery.module';
import { DatabaseClientModule } from './libs/database/index.module';
import { AgendaService } from './services/agenda/agenda.service';
import { sendEmail } from './services/agenda/use-cases/send-email';
import { removeEmailByEmail } from './services/agenda/use-cases/remove-email';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: `.env`, isGlobal: true }), // Make env initialization global
    DatabaseClientModule,
    EmailClientModule,
    AgendaModule,
    AppRoutesModule,
  ],
  providers: [AgendaService], // Ensure AgendaProvider is included here
})
export class AppModule implements OnModuleInit {
  constructor(private readonly agendaProvider: AgendaService) {}

  async onModuleInit() {
    this.agendaProvider.defineJob('send email', async (job) => {
      const { emailDetails } = job.attrs.data;
      await sendEmail(emailDetails);
      await removeEmailByEmail(emailDetails.email);
    });

    // Start the Agenda jobs after defining them
    await this.agendaProvider.start(); // Ensure you have a start method in your AgendaProvider
  }
}
