import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, QueueOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';

/**
 * Simplified Queue Manager that lets BullMQ handle Redis connections
 */
@Injectable()
export class QueueManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueManagerService.name);
  private readonly queues: Map<string, Queue> = new Map();
  private readonly queuePrefix = 'outreach-action';

  // Shared connection config for all queues
  private readonly connectionOptions: QueueOptions['connection'];

  constructor(private readonly configService: ConfigService) {
    // Define connection options once
    this.connectionOptions = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
    };
  }

  /**
   * Get or create a queue for a specific organization
   * This is called on-demand when we need to enqueue jobs
   */
  async getOrCreateQueue(organizationId: string): Promise<Queue> {
    if (!this.queues.has(organizationId)) {
      const queueName = `${this.queuePrefix}-${organizationId}`;
      this.logger.log(`Creating queue for organization: ${organizationId}`);

      const queue = new Queue(queueName, {
        connection: this.connectionOptions, // BullMQ creates its own connection
        defaultJobOptions: {
          removeOnComplete: {
            age: 3600, // 1 hour
            count: 100,
          },
          removeOnFail: {
            age: 24 * 3600, // 24 hours
            count: 500,
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      this.queues.set(organizationId, queue);
    }

    return this.queues.get(organizationId)!;
  }

  /**
   * Get queue metrics for monitoring
   */
  async getQueueMetrics(organizationId: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  } | null> {
    const queue = this.queues.get(organizationId);
    if (!queue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed, paused] =
      await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);

    return { waiting, active, completed, failed, delayed, paused };
  }

  /**
   * Clean up inactive queues
   * This should be called periodically to free memory
   */
  async cleanupInactiveQueues(): Promise<void> {
    for (const [orgId, queue] of this.queues) {
      const metrics = await this.getQueueMetrics(orgId);

      // Remove queue if it has no pending or active jobs
      if (metrics && metrics.waiting === 0 && metrics.active === 0) {
        await queue.close();
        this.queues.delete(orgId);
        this.logger.log(`Removed inactive queue for organization: ${orgId}`);
      }
    }
  }

  /**
   * Get list of active organizations (those with queues)
   */
  getActiveOrganizations(): string[] {
    return Array.from(this.queues.keys());
  }

  async onModuleDestroy() {
    this.logger.log('Closing all queues...');

    // Close all queues gracefully
    await Promise.all(
      Array.from(this.queues.values()).map((queue) =>
        queue
          .close()
          .catch((err) => this.logger.error('Error closing queue:', err)),
      ),
    );
  }
}
