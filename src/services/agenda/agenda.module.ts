// agenda.module.ts
import { Module } from '@nestjs/common';
import { AgendaProvider } from './agenda.provider';
import { EmailClientModule } from '../../libs/email-delivery-client/email-delivery.module';

@Module({
  providers: [AgendaProvider, EmailClientModule],
  exports: [AgendaProvider], // Ensure it's exported
})
export class AgendaModule {}
