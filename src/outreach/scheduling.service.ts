import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository, In, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledAction } from './entities/scheduled-action.entity';
import { ScheduledActionStatus } from './enums/scheduled-action-status.enum';
import { QueueManagerService } from '../queue/queue-manager.service';
import { WorkerManagerService } from '../queue/worker-manager.service';
import { ConfigService } from '@nestjs/config';

interface ScheduledActionJobData {
  scheduledActionId: string;
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @InjectRepository(ScheduledAction)
    private readonly scheduledActionRepository: Repository<ScheduledAction>,
    private readonly queueManagerService: QueueManagerService,
    private readonly workerManagerService: WorkerManagerService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueDueActions() {
    this.logger.log('Checking for due actions to enqueue...');

    const actionsToProcess = await this.scheduledActionRepository.find({
      where: {
        status: ScheduledActionStatus.PENDING,
        scheduled_at: LessThanOrEqual(new Date()),
      },
      relations: [
        'conversation',
        'conversation.person',
        'conversation.person.organization',
      ],
    });

    if (actionsToProcess.length === 0) {
      this.logger.log('No due actions found.');
      return;
    }

    this.logger.log(`Found ${actionsToProcess.length} actions to enqueue.`);

    // Group actions by organization for efficient processing
    const actionsByOrg = new Map<string, ScheduledAction[]>();

    for (const action of actionsToProcess) {
      const organizationId = action.conversation.person.organization?.id;
      if (!organizationId) {
        this.logger.warn(
          `Action ${action.id} is missing an organization ID. Skipping.`,
        );
        continue;
      }

      if (!actionsByOrg.has(organizationId)) {
        actionsByOrg.set(organizationId, []);
      }
      actionsByOrg.get(organizationId)!.push(action);
    }

    // Process each organization's actions
    for (const [organizationId, actions] of actionsByOrg) {
      try {
        // Get or create queue for this organization
        const queue =
          await this.queueManagerService.getOrCreateQueue(organizationId);

        // Ensure worker exists for this organization
        await this.workerManagerService.getOrCreateWorker(organizationId);

        // Process actions in a transaction for atomicity
        await this.dataSource.transaction(
          async (transactionalEntityManager) => {
            // First, update all actions to PROCESSING status within the transaction
            const actionIds = actions.map((action) => action.id);
            await transactionalEntityManager.update(
              ScheduledAction,
              { id: In(actionIds) },
              { status: ScheduledActionStatus.PROCESSING },
            );

            // Prepare bulk job data
            const bulkJobs = actions.map((action) => ({
              name: 'process-outreach-action',
              data: { scheduledActionId: action.id } as ScheduledActionJobData,
              opts: {
                jobId: `action-${action.id}`,
                // Add delay if needed for send window calculation
                // delay: this.calculateDelay(action),
              },
            }));

            // Add all jobs to the queue in bulk
            const jobs = await queue.addBulk(bulkJobs);

            // Update actions with their job IDs
            const updatePromises = jobs.map((job, index) => {
              if (job && job.id) {
                return transactionalEntityManager.update(
                  ScheduledAction,
                  { id: actions[index].id },
                  { bull_job_id: job.id.toString() },
                );
              }
              return Promise.resolve();
            });

            await Promise.all(updatePromises);

            this.logger.log(
              `Enqueued ${jobs.length} actions for organization ${organizationId}`,
            );
          },
        );
      } catch (error) {
        this.logger.error(
          `Error processing actions for org ${organizationId}: ${error.message}`,
          error.stack,
        );

        // If transaction failed, ensure actions are reverted to PENDING
        const actionIds = actions.map((action) => action.id);
        await this.scheduledActionRepository.update(
          { id: In(actionIds) },
          { status: ScheduledActionStatus.PENDING },
        );
      }
    }
  }

  /**
   * Clean up scheduled actions that have been stuck in PROCESSING for too long
   * This handles cases where the worker crashed or the job was lost
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupStuckActions() {
    const stuckThreshold = new Date();
    stuckThreshold.setMinutes(stuckThreshold.getMinutes() - 30); // Actions stuck for 30+ minutes

    const stuckActions = await this.scheduledActionRepository.find({
      where: {
        status: ScheduledActionStatus.PROCESSING,
        updated_at: LessThanOrEqual(stuckThreshold),
      },
    });

    if (stuckActions.length > 0) {
      this.logger.warn(
        `Found ${stuckActions.length} stuck actions. Resetting to PENDING.`,
      );

      const stuckActionIds = stuckActions.map((action) => action.id);
      await this.scheduledActionRepository.update(
        { id: In(stuckActionIds) },
        { status: ScheduledActionStatus.PENDING, bull_job_id: undefined },
      );
    }
  }

  /**
   * Calculate delay for send window scheduling
   * TODO: Implement timezone-aware send window logic
   */
  private calculateDelay(action: ScheduledAction): number {
    // For now, return 0 (no delay)
    // In production, calculate based on:
    // - Person's timezone
    // - Organization's send window settings
    // - Current time vs optimal send time
    return 0;
  }
}
