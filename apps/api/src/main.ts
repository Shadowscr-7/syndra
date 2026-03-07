import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: [
      process.env.APP_URL || 'http://localhost:3002',
      'http://localhost:3000',
      'http://localhost:3002',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 API running on http://localhost:${port}/api`);
}

bootstrap();
