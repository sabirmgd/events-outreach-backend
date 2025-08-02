import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job, WorkerOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { ActionProcessor } from '../outreach/processors/action.processor';

interface WorkerInfo {
  worker: Worker;
  organizationId: string;
  jobsProcessed: number;
  lastActiveAt: Date;
}

/**
 * Simplified Worker Manager that creates workers on-demand
 */
@Injectable()
export class WorkerManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerManagerService.name);
  private readonly workers: Map<string, WorkerInfo> = new Map();
  private readonly maxWorkersPerOrg = 2;
  private actionProcessor: ActionProcessor;
  
  // Shared connection config for all workers
  private readonly connectionOptions: WorkerOptions['connection'];

  constructor(
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {
    // Define connection options once
    this.connectionOptions = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    };
  }

  async onModuleInit() {
    // Resolve ActionProcessor to avoid circular dependency
    this.actionProcessor = this.moduleRef.get(ActionProcessor, {
      strict: false,
    });
  }

  /**
   * Get or create a worker for an organization
   * Called when we enqueue jobs for that organization
   */
  async getOrCreateWorker(organizationId: string): Promise<Worker> {
    const workerId = `worker-${organizationId}`;
    
    // Return existing worker if available
    const existing = this.workers.get(workerId);
    if (existing) {
      existing.lastActiveAt = new Date();
      return existing.worker;
    }

    // Create new worker
    this.logger.log(`Creating worker for organization: ${organizationId}`);
    
    const queueName = `outreach-action-${organizationId}`;
    
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        // Track activity
        const workerInfo = this.workers.get(workerId);
        if (workerInfo) {
          workerInfo.lastActiveAt = new Date();
          workerInfo.jobsProcessed++;
        }

        // Process the job
        return this.actionProcessor.process(job);
      },
      {
        connection: this.connectionOptions, // BullMQ creates its own connection
        concurrency: this.maxWorkersPerOrg,
        limiter: {
          max: 100, // 100 jobs per minute per org
          duration: 60000,
        },
      }
    );

    // Add event listeners
    worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed for org ${organizationId}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id} failed for org ${organizationId}:`,
        err,
      );
    });

    // Store worker info
    const workerInfo: WorkerInfo = {
      worker,
      organizationId,
      jobsProcessed: 0,
      lastActiveAt: new Date(),
    };

    this.workers.set(workerId, workerInfo);
    return worker;
  }

  /**
   * Remove idle workers
   * Should be called periodically to free resources
   */
  async removeIdleWorkers(idleMinutes: number = 5): Promise<void> {
    const now = Date.now();
    const idleThreshold = idleMinutes * 60 * 1000;
    
    for (const [workerId, workerInfo] of this.workers) {
      const idleTime = now - workerInfo.lastActiveAt.getTime();
      
      if (idleTime > idleThreshold) {
        await workerInfo.worker.close();
        this.workers.delete(workerId);
        this.logger.log(
          `Removed idle worker for organization: ${workerInfo.organizationId}`,
        );
      }
    }
  }

  /**
   * Get worker metrics
   */
  getWorkerMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [workerId, workerInfo] of this.workers) {
      metrics[workerId] = {
        organizationId: workerInfo.organizationId,
        jobsProcessed: workerInfo.jobsProcessed,
        lastActiveAt: workerInfo.lastActiveAt,
      };
    }

    return metrics;
  }

  async onModuleDestroy() {
    this.logger.log('Closing all workers...');
    
    await Promise.all(
      Array.from(this.workers.values()).map((workerInfo) =>
        workerInfo.worker
          .close()
          .catch((err) => this.logger.error('Error closing worker:', err)),
      ),
    );
  }
}