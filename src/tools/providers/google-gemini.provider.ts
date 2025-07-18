import { Injectable } from '@nestjs/common';
import { BaseToolProvider } from './base.provider';
import { Job } from '@jobs/entities/job.entity';

@Injectable()
export class GoogleGeminiProvider extends BaseToolProvider {
  execute(job: Job): Promise<string> {
    // TODO: Implement actual API call to Google Gemini
    console.log(`Executing Google Gemini for job: ${job.id}`);
    return Promise.resolve('Raw output from Google Gemini');
  }
}
