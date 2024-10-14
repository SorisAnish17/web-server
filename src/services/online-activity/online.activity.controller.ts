import { Body, Controller, Post } from '@nestjs/common';
import { OnlineActivityService } from './online-activity.service';
import { OnlineActivityDto } from '../../core/dto/online-activity/index';

@Controller('online-activity')
export class OnlineActivityController {
  constructor(private readonly onlineActivityService: OnlineActivityService) {}

  @Post()
  async createOnlineActivity(@Body() onlineActivityDto: OnlineActivityDto) {
    return this.onlineActivityService.generateOnlineActivity(onlineActivityDto);
  }
}
