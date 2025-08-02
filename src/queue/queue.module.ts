import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueManagerService } from './queue-manager.service';
import { WorkerManagerService } from './worker-manager.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledAction } from '../outreach/entities/scheduled-action.entity';

@Global() // Make it global so it can be used across modules
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([ScheduledAction]),
  ],
  providers: [QueueManagerService, WorkerManagerService],
  exports: [QueueManagerService, WorkerManagerService, BullModule],
})
export class QueueModule {}