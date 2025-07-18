import { Job } from '@jobs/entities/job.entity';

export abstract class BaseToolProvider {
  abstract execute(job: Job): Promise<string>;
}
