import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5173',
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

  const config = app.get(ConfigService);
  const port = config.get('app.port');
  await app.listen(port || 3000);
  
  console.log(`Application is running on: http://localhost:${port || 3000}`);
  console.log(`Swagger documentation is available at: http://localhost:${port || 3000}/api`);
}
bootstrap();
