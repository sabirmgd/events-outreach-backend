import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventCandidate } from './entities/event-candidate.entity';
import { EventSource } from './entities/event-source.entity';
import { EventSponsor } from './entities/event-sponsor.entity';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { GeographyModule } from '@geography/geography.module';
import { CompanyModule } from '@company/company.module';
import { JobsModule } from '@jobs/jobs.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      EventCandidate,
      EventSource,
      EventSponsor,
    ]),
    GeographyModule,
    CompanyModule,
    JobsModule,
    AuthModule,
  ],
  providers: [EventService],
  controllers: [EventController],
  exports: [EventService],
})
export class EventModule {}
