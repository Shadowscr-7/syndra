import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Needed for PayPal webhook signature verification
  });
  const logger = new Logger('Bootstrap');

  // Cookie parser — required for JWT cookie-based auth
  app.use(cookieParser());

  app.enableCors({
    origin: [
      process.env.APP_URL || 'http://localhost:3002',
      'http://localhost:3000',
      'http://localhost:3002',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Serve uploaded files statically
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 API running on http://localhost:${port}/api`);
}

bootstrap();
