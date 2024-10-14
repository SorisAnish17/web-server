import { Module } from '@nestjs/common';
import { DatabaseClientService } from './index.service';

@Module({
  providers: [DatabaseClientService],

  exports: [DatabaseClientService],
})
export class DatabaseClientModule {}
