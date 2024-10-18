import { Module } from '@nestjs/common';
import { EmailClientService } from './email-delivery.service';

@Module({
  providers: [EmailClientService],
  exports: [EmailClientService],
})
export class EmailClientModule {}
