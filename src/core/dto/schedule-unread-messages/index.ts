import { IsEmail, IsString, IsOptional } from 'class-validator';
import { IsMongoId } from 'class-validator';
import { ObjectId } from 'mongodb';

export class ScheduleUnreadMessageDto {
  @IsMongoId()
  messageId: ObjectId;

  @IsString()
  name: string;

  @IsOptional() // Assuming 'message' can be a file or a string
  @IsString()
  message: string | File;

  @IsEmail()
  email: string;
}
