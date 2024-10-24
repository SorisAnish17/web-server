import { Module } from '@nestjs/common';
import { DatabaseClientService } from './index.service';
import { EmailClientModule } from '../email-delivery-client/email-delivery.module';

@Module({
  providers: [DatabaseClientService, EmailClientModule],

  exports: [DatabaseClientService],
})
export class DatabaseClientModule {}
