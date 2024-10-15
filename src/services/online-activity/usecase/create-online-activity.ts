import { HttpException, HttpStatus } from '@nestjs/common';
import { OnlineActivityDto } from '../../../core/dto/online-activity/index';
import { OnlineActivityCollection } from '../../../libs/database/collections/online-activity/online-activity';

export const generateOnlineActivity = (
  onlineActivityCollection: OnlineActivityCollection,
) => {
  return async (socketConnection: OnlineActivityDto) => {
    try {
      const message =
        await onlineActivityCollection.generateOnlineActivity(socketConnection);

      return { message: message };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          'Failed to create staff',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  };
};
