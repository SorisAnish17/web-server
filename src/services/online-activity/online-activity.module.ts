// online-activity.module.ts
import { Module } from '@nestjs/common';
import { OnlineActivityService } from './online-activity.service';
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';
import { DatabaseClientModule } from '../../libs/database/index.module';

@Module({
  imports: [DatabaseClientModule],
  controllers: [],
  providers: [OnlineActivityService, OnlineActivityCollection],
  exports: [OnlineActivityService, OnlineActivityCollection],
})
export class OnlineActivityModule {}
