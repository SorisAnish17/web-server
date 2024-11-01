import { IsEmail, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ObjectId } from 'mongodb';

export class EmailDetailsDto {
  @IsMongoId()
  messageId: ObjectId;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  message: string | File;

  @IsMongoId()
  @Type(() => ObjectId) // Ensures that it is transformed to ObjectId
  userId: ObjectId;
}
