import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Apply raw body parser for all routes
  app.use(bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }));

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const config = app.get(ConfigService);
  const port = config.get('app.port');
  await app.listen(port || 3000);
}
bootstrap();
