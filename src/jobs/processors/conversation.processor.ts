import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job as BullMQJob } from 'bullmq';
import { Job } from '../entities/job.entity';
import { CONVERSATION_QUEUE } from '../../queue/constants';
import { ConversationService } from '../../outreach/conversation.service';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Conversation } from '../../outreach/entities/conversation.entity';
import { ConversationAutomationStatus } from '../../outreach/enums/conversation-automation-status.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { OutreachStepTemplate } from '../../outreach/entities/outreach-step-template.entity';
import { Logger } from '@nestjs/common';

@Processor(CONVERSATION_QUEUE)
export class ConversationProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversationProcessor.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(OutreachStepTemplate)
    private readonly stepTemplateRepository: Repository<OutreachStepTemplate>,
    private readonly conversationService: ConversationService,
  ) {
    super();
  }

  async process(_job: BullMQJob<Job, any, string>): Promise<any> {
    this.logger.log(`Starting conversation processing job...`);
    const conversationsToProcess = await this.conversationRepository.find({
      where: {
        automation_status: ConversationAutomationStatus.ACTIVE,
        next_action_at: LessThanOrEqual(new Date()),
      },
      relations: ['sequence', 'current_step', 'person'],
    });

    this.logger.log(
      `Found ${conversationsToProcess.length} conversations to process.`,
    );

    for (const conversation of conversationsToProcess) {
      this.logger.log(
        `Processing conversation ${conversation.id} for ${conversation.person.first_name}`,
      );
      // 1. Execute the current step's action (placeholder)
      this.logger.log(
        `  - Executing step: ${conversation.current_step.channel}`,
      );

      // 2. Find the next step in the sequence
      const nextStep = await this.stepTemplateRepository.findOne({
        where: {
          sequence: { id: conversation.sequence.id },
          day_offset: MoreThan(conversation.current_step.day_offset),
        },
        order: {
          day_offset: 'ASC',
        },
      });

      if (nextStep) {
        // 3. Update conversation to point to the next step
        this.logger.log(`  - Found next step: Day ${nextStep.day_offset}`);
        conversation.current_step = nextStep;
        const nextActionDate = new Date();
        // This logic is simplified; a real implementation would use a date-fns or similar library
        nextActionDate.setDate(
          nextActionDate.getDate() +
            (nextStep.day_offset - conversation.current_step.day_offset),
        );
        conversation.next_action_at = nextActionDate;
        await this.conversationRepository.save(conversation);
      } else {
        // 4. No more steps, complete the sequence
        this.logger.log(`  - No more steps. Completing sequence.`);
        conversation.automation_status = ConversationAutomationStatus.COMPLETED;
        conversation.next_action_at = null;
        await this.conversationRepository.save(conversation);
      }
    }

    return { status: 'completed', processed: conversationsToProcess.length };
  }
}
