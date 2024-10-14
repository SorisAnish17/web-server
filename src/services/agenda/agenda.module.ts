// agenda.module.ts
import { Module } from '@nestjs/common';
import { AgendaProvider } from './agenda.provider';

@Module({
  providers: [AgendaProvider],
  exports: [AgendaProvider], // Ensure it's exported
})
export class AgendaModule {}
