import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // You can configure this to allow specific origins if needed
    credentials: true,
  });

  dotenv.config();

  await app.listen(8000);
}
bootstrap();
