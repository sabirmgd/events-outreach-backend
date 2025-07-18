import { Controller, Get, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Job> {
    return this.jobsService.findOne(id);
  }
}
