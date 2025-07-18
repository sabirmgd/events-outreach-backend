import { Injectable } from '@nestjs/common';
import { BaseToolProvider } from './base.provider';
import { Job } from '@jobs/entities/job.entity';
import { PerplexityClient } from '@clients/perplexity.client';

@Injectable()
export class PerplexityProvider extends BaseToolProvider {
  constructor(private readonly perplexityClient: PerplexityClient) {
    super();
  }

  async execute(job: Job): Promise<string> {
    // The existing client uses a template/variable system, but our job's
    // executionPrompt is already fully hydrated. So, we pass it directly.
    return await this.perplexityClient.chatCompletion(job.executionPrompt, {});
  }
}
