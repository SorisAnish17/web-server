import { Injectable } from '@nestjs/common';
import { setSchedule } from './usecase/set-scheduler';
import { ScheduleUnreadMessagesCollection } from '../../libs/database/collections/schedule-unread-messages/schedule-unread-messages';
import { DatabaseClientService } from '../../libs/database/index.service';
import { AgendaProvider } from '../agenda/agenda.controller';
import { removeUserFromScheduler } from './usecase/remove-user-from-scheduler';

@Injectable()
export class ScheduleUnreadMessageService {
  constructor(
    private readonly scheduleUnreadMessagesCollection: ScheduleUnreadMessagesCollection,
    private readonly databaseClientService: DatabaseClientService,
    private readonly agendaProvider: AgendaProvider,
  ) {}

  readonly setScheduler = setSchedule(
    this.databaseClientService,
    this.scheduleUnreadMessagesCollection,
    this.agendaProvider,
  );

  readonly removeUserFromUser = removeUserFromScheduler(
    this.agendaProvider,
    this.databaseClientService,
  );
}
