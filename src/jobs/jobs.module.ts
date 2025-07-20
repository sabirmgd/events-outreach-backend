import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from '@jobs/jobs.service';
import { Job } from '@jobs/entities/job.entity';
import { DiscoveryProcessor } from '@jobs/processors/discovery.processor';
import { ToolsModule } from '@tools/tools.module';
import { JobsController } from './jobs.controller';
import { Event } from '@event/entities/event.entity';
import { City } from '@geography/entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Event, City]), ToolsModule],
  providers: [JobsService, DiscoveryProcessor],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
