import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  EVENT_QUEUE,
  SCRAPE_QUEUE,
  ENRICHMENT_QUEUE,
  PERSONA_QUEUE,
} from './constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: EVENT_QUEUE,
    }),
    BullModule.registerQueue({
      name: SCRAPE_QUEUE,
    }),
    BullModule.registerQueue({
      name: ENRICHMENT_QUEUE,
    }),
    BullModule.registerQueue({
      name: PERSONA_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
