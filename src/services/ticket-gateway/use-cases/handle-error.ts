import { HttpException, HttpStatus } from '@nestjs/common';

export const handleError = async (message: string, error: any) => {
  console.error(`${message}:`, error.message || error);
  throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
};
