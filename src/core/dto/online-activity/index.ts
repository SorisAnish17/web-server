import { IsString } from 'class-validator';
import { ObjectId } from 'mongodb';

export class OnlineActivityDto {
  @IsString()
  _id?: ObjectId;

  @IsString()
  userId: string;

  @IsString()
  socketId: string;

  @IsString()
  status?: string;
}
