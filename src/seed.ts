import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './admin/seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(SeedService);

  console.log('Seeding database...');
  await seeder.onModuleInit();
  console.log('Seeding complete.');

  await app.close();
}

bootstrap();
