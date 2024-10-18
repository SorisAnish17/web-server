import { IsEmail, IsString, IsOptional, IsMongoId } from 'class-validator';
import { ObjectId } from 'mongodb';

export class ScheduleUnreadMessageDto {
  @IsMongoId()
  messageId: ObjectId;

  @IsMongoId() // Correctly validating as a MongoDB ObjectId
  userId: ObjectId;

  @IsString()
  name: string;

  @IsOptional() // Assuming 'message' can be a file or a string
  @IsString()
  message: string | File;

  @IsEmail()
  email: string;
}
