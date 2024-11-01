import { Module } from '@nestjs/common';
import { ScheduleUnreadMessageService } from './schedule-unread.service'; // Ensure this is the correct path
import { DatabaseClientService } from '../../libs/database/index.service';

@Module({
  imports: [],
  providers: [ScheduleUnreadMessageService, DatabaseClientService],
  exports: [ScheduleUnreadMessageService],
})
export class ScheduleUnreadMessagesModule {}
