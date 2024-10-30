import { IsEmail, IsString, IsOptional, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer'; // Make sure to import Type
import { ObjectId } from 'mongodb';

export class ScheduleUnreadMessageDto {
  @IsMongoId() // Validate as a MongoDB ObjectId
  @Type(() => ObjectId) // Correctly transforming to ObjectId if needed
  messageId: ObjectId;

  @IsMongoId() // Validate as a MongoDB ObjectId
  @Type(() => ObjectId) // Correctly transforming to ObjectId if needed
  userId: ObjectId;

  @IsString()
  name: string;

  @IsOptional() // Assuming 'message' can be a string or omitted
  @IsString() // Validate as string
  message?: string | File; // Use optional chaining to indicate it's optional

  @IsEmail()
  email: string;
}
