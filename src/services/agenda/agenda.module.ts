// agenda.module.ts
import { Module } from '@nestjs/common';
import { AgendaProvider } from './agenda.controller';

@Module({
  providers: [AgendaProvider],
  exports: [AgendaProvider],
})
export class AgendaModule {}
