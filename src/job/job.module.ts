import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapeJob } from './entities/scrape-job.entity';
import { JobArtifact } from './entities/job-artifact.entity';
import { EnrichmentJob } from './entities/enrichment-job.entity';
import { JobController } from './job.controller';
import { JobService } from './job.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScrapeJob, JobArtifact, EnrichmentJob])],
  providers: [JobService],
  controllers: [JobController],
  exports: [JobService],
})
export class JobModule {}
