import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('[Bootstrap] Creating NestJS application...');
  const app = await NestFactory.create(AppModule);

  // Enable WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3001',
      'http://localhost:8080',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Events Outreach API')
    .setDescription('B2B outreach automation platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  logger.log('[Bootstrap] Setting up server configuration...');
  const config = app.get(ConfigService);
  const port = config.get('app.port') || 3000;

  logger.log(`[Bootstrap] Starting server on port ${port}...`);
  await app.listen(port);

  logger.log(
    `[Bootstrap] ✅ Application is running on: http://localhost:${port}`,
  );
  logger.log(
    `[Bootstrap] ✅ Swagger documentation is available at: http://localhost:${port}/api`,
  );
  logger.log(
    '[Bootstrap] ✅ WebSocket gateway available at: /agent-execution namespace',
  );

  // Log environment status
  logger.log(
    `[Bootstrap] Environment: ${process.env.NODE_ENV || 'development'}`,
  );
  logger.log(
    `[Bootstrap] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`,
  );
  logger.log(
    `[Bootstrap] TAVILY_API_KEY: ${process.env.TAVILY_API_KEY ? '✅ Configured' : '❌ Missing'}`,
  );
}
bootstrap();
