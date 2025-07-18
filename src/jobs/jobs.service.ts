import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { CreateJobDto } from './dtos/create-job.dto';
import { JobStatus } from './enums/job-status.enum';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async create(
    createJobDto: CreateJobDto,
    executionPrompt: string,
  ): Promise<Job> {
    const job = this.jobRepository.create({
      ...createJobDto,
      executionPrompt,
      status: JobStatus.PENDING,
    });
    return this.jobRepository.save(job);
  }

  async updateStatus(jobId: string, status: JobStatus): Promise<void> {
    await this.jobRepository.update(jobId, { status });
  }

  async logOutput(
    jobId: string,
    rawOutput: string,
    structuredOutput?: Record<string, any>,
  ): Promise<void> {
    await this.jobRepository.update(jobId, { rawOutput, structuredOutput });
  }

  async logError(jobId: string, error: string): Promise<void> {
    await this.jobRepository.update(jobId, { error, status: JobStatus.FAILED });
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOneBy({ id });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }
}
