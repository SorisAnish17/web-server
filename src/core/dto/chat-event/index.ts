import {
  IsEnum,
  IsMongoId,
  IsString,
  IsBoolean,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ObjectId } from 'mongodb';

enum MessageType {
  Event = 'Event',
  Message = 'Message',
}

enum BodyType {
  File = 'File',
  Text = 'Text',
}

class BodyDto {
  @IsEnum(BodyType)
  type: BodyType;

  @IsString()
  content: string;
}

export class ReadByDto {
  @Type(() => ObjectId)
  userId: ObjectId;

  @IsString()
  type: string;

  @IsString()
  timestamp: string;
}

class SenderDto {
  @IsMongoId()
  _id: ObjectId;

  @IsString()
  type: string;
}

export class CreateChatMessageDto {
  @Type(() => ObjectId)
  _id?: ObjectId;

  @IsString() // Validate that chatRoomId is a string
  chatRoomId: string;

  @IsEnum(MessageType)
  type: MessageType;

  @ValidateNested()
  @Type(() => BodyDto)
  body: BodyDto;

  @ValidateNested({ each: true })
  @Type(() => ReadByDto)
  readBy: ReadByDto[];

  @IsBoolean()
  deleted: boolean;

  @ValidateNested()
  @Type(() => SenderDto)
  sender: SenderDto;

  @IsOptional() // Optional field
  @Type(() => Date)
  updatedAt?: Date; // Add updatedAt field
}
