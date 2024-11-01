import { IsString, IsBoolean } from 'class-validator';

export class ResponseMessageDto {
  @IsString()
  message: string;

  @IsBoolean()
  success: boolean;

  constructor(message: string, success: boolean) {
    this.message = message;
    this.success = success;
  }
}
