import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  // rawBody: true preserves req.rawBody for SePay HMAC verification (must not re-serialize JSON).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Field không khai báo trong DTO sẽ bị loại bỏ.
      transform: true, // class-transformer convert request body sang DTO class.
      forbidNonWhitelisted: true, // Client gửi field lạ thì báo lỗi để FE sửa contract.
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log(`AURA SPA API running at http://localhost:${port}`);
  logger.log(`Swagger docs running at http://localhost:${port}/api/docs`);
}

void bootstrap();
