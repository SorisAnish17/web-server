// src/main.ts (Main Entry Point)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  // Enable CORS for testing
  app.enableCors({
    origin: '*', // Allow all origins for testing purposes
    credentials: true,
  });

  await app.listen(8000);
}

bootstrap();
