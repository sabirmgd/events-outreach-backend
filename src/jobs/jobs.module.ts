import { Module, forwardRef } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { DiscoveryProcessor } from './processors/discovery.processor';
import { ToolsModule } from '../tools/tools.module';
import { ConfigModule } from '@nestjs/config';
import { EventModule } from '../event/event.module';
import { GeographyModule } from '../geography/geography.module';
import { DISCOVERY_QUEUE, CONVERSATION_QUEUE } from '../queue/constants';
import { ConversationProcessor } from './processors/conversation.processor';
import { OutreachModule } from '../outreach/outreach.module';
import { Event } from '../event/entities/event.entity';
import { City } from '../geography/entities/city.entity';
import { Conversation } from '../outreach/entities/conversation.entity';
import { OutreachStepTemplate } from '../outreach/entities/outreach-step-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      Event,
      City,
      Conversation,
      OutreachStepTemplate,
    ]),
    BullModule.registerQueue({ name: DISCOVERY_QUEUE }),
    BullModule.registerQueue({ name: CONVERSATION_QUEUE }),
    ToolsModule,
    ConfigModule,
    forwardRef(() => EventModule),
    GeographyModule,
    forwardRef(() => OutreachModule),
  ],
  controllers: [JobsController],
  providers: [JobsService, DiscoveryProcessor, ConversationProcessor],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
