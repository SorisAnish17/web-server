import { Injectable } from '@nestjs/common';
import { OnlineActivityCollection } from '../../libs/database/collections/online-activity/online-activity';
import { generateOnlineActivity } from '../online-activity/usecase/create-online-activity';

@Injectable()
export class OnlineActivityService {
  constructor(
    private readonly onlineActivityCollection: OnlineActivityCollection,
  ) {}

  readonly generateOnlineActivity = generateOnlineActivity(
    this.onlineActivityCollection,
  );
}
