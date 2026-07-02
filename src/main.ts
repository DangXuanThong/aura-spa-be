import 'reflect-metadata';
import * as cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { LoggingInterceptor } from 'src/common/interceptors/logging.interceptor';
import { SocketIOAdapter } from 'src/common/adapters/socket-io.adapter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  // rawBody: true preserves req.rawBody for SePay HMAC verification (must not re-serialize JSON).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // In production FRONTEND_URL must be set explicitly; dev falls back to localhost
  const frontendUrl = isProduction
    ? configService.getOrThrow<string>('FRONTEND_URL')
    : (configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000');

  // 127.0.0.1 is a dev-only convenience origin — strip it in production
  const allowedOrigins = isProduction ? [frontendUrl] : [frontendUrl, 'http://127.0.0.1:3000'];

  app.useWebSocketAdapter(new SocketIOAdapter(app, configService));

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger is disabled in production to avoid leaking API schema
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AURA SPA API')
      .setDescription('API contract for AURA SPA multi-branch spa management system')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'access-token',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
    logger.log(`Swagger docs at http://localhost:${configService.get<number>('PORT', 3001)}/api/docs`);
  }

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log(`AURA SPA API running on port ${port} [${isProduction ? 'production' : 'development'}]`);
}

void bootstrap();
