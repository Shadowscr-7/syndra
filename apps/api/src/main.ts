import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Needed for PayPal webhook signature verification
  });
  const logger = new Logger('Bootstrap');

  // Trust reverse proxy (Traefik) — needed for req.ip, req.protocol, secure cookies
  app.set('trust proxy', true);

  // Cookie parser — required for JWT cookie-based auth
  app.use(cookieParser());

  // Global validation pipe — rejects unknown fields, transforms types
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  const corsOrigins: string[] = [
    process.env.APP_URL || 'http://localhost:3002',
  ];
  // Only allow localhost origins in development
  if (process.env.NODE_ENV !== 'production') {
    corsOrigins.push('http://localhost:3000', 'http://localhost:3002');
  }
  app.enableCors({
    origin: corsOrigins,
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
