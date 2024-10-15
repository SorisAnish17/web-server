import {
  IsEnum,
  IsMongoId,
  IsString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

class ReadByDto {
  @IsMongoId()
  _id: string;

  @IsString()
  type: string;

  @IsString()
  timestamp: string;
}

class SenderDto {
  @IsMongoId()
  _id: string;

  @IsString()
  type: string;
}

export class CreateChatMessageDto {
  @IsMongoId()
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
}
