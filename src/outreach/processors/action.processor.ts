import { Injectable, Logger } from '@nestjs/common';
import { Job as BullMQJob } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, MoreThanOrEqual } from 'typeorm';
import { ScheduledAction } from '../entities/scheduled-action.entity';
import { ScheduledActionStatus } from '../enums/scheduled-action-status.enum';
import { ConversationAutomationStatus } from '../enums/conversation-automation-status.enum';
import { Message } from '../entities/message.entity';
import { SendGridClient } from '../../clients/sendgrid.client';
import { OutreachStepTemplate } from '../entities/outreach-step-template.entity';
import { Conversation } from '../entities/conversation.entity';
import { ScheduledActionChannel } from '../enums/scheduled-action-channel.enum';
import { ScheduledActionType } from '../enums/scheduled-action-type.enum';
import { EmailSender } from '../../organization/entities/email-sender.entity';
import { ConfigService } from '@nestjs/config';

interface ScheduledActionJobData {
  scheduledActionId: string;
}

interface ScheduledActionJobResult {
  status: string;
  scheduledActionId: string;
}

@Injectable()
export class ActionProcessor {
  private readonly logger = new Logger(ActionProcessor.name);
  private readonly sendGridClient: SendGridClient;

  constructor(
    @InjectRepository(ScheduledAction)
    private readonly scheduledActionRepository: Repository<ScheduledAction>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(OutreachStepTemplate)
    private readonly stepTemplateRepository: Repository<OutreachStepTemplate>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(EmailSender)
    private readonly emailSenderRepository: Repository<EmailSender>,
    private readonly configService: ConfigService,
  ) {
    // Initialize SendGridClient with API key from config
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const senderEmail = this.configService.get<string>('SENDER_EMAIL');

    if (apiKey) {
      this.sendGridClient = new SendGridClient(
        apiKey,
        senderEmail, // Default sender email
      );
    }
  }

  async process(
    job: BullMQJob<ScheduledActionJobData, ScheduledActionJobResult>,
  ): Promise<ScheduledActionJobResult> {
    const { scheduledActionId } = job.data;
    this.logger.log(`Processing job ${job.id} for action ${scheduledActionId}`);

    let scheduledAction: ScheduledAction | null;
    try {
      // Fetch the scheduled action with all necessary relations
      scheduledAction = await this.scheduledActionRepository.findOne({
        where: { id: scheduledActionId },
        relations: [
          'conversation',
          'conversation.person',
          'conversation.person.organization',
          'conversation.sequence',
          'step',
          'email_sender',
          'linkedin_account',
        ],
      });

      if (!scheduledAction) {
        this.logger.warn(
          `Scheduled action ${scheduledActionId} not found. Skipping.`,
        );
        return { status: 'skipped', scheduledActionId };
      }

      // Guard: Check if conversation is still active and action is still processing
      if (
        scheduledAction.conversation.automation_status !==
          ConversationAutomationStatus.ACTIVE ||
        scheduledAction.status !== ScheduledActionStatus.PROCESSING
      ) {
        this.logger.log(
          `Action ${scheduledActionId} skipped: Conversation status is ${scheduledAction.conversation.automation_status} or action status is ${scheduledAction.status}.`,
        );
        return { status: 'skipped', scheduledActionId };
      }

      // TODO: Implement Rate Limiting
      // Check daily limits for the sender
      // If rate limited, delay the job and update status back to PENDING

      // Process based on channel
      switch (scheduledAction.channel) {
        case ScheduledActionChannel.EMAIL:
          await this.handleEmailAction(scheduledAction);
          break;
        case ScheduledActionChannel.LINKEDIN:
          // TODO: Implement LinkedIn action handling
          this.logger.warn(
            `LinkedIn actions not yet implemented for ${scheduledActionId}`,
          );
          await this.scheduledActionRepository.update(scheduledAction.id, {
            status: ScheduledActionStatus.FAILED,
          });
          return { status: 'failed', scheduledActionId };
        default:
          this.logger.error(
            `Unknown channel for scheduled action ${scheduledActionId}: ${scheduledAction.channel}`,
          );
          await this.scheduledActionRepository.update(scheduledAction.id, {
            status: ScheduledActionStatus.FAILED,
          });
          return { status: 'failed', scheduledActionId };
      }

      // Mark action as sent
      await this.scheduledActionRepository.update(scheduledAction.id, {
        status: ScheduledActionStatus.SENT,
      });

      // Update conversation's last_step_sent
      await this.conversationRepository.update(
        scheduledAction.conversation.id,
        {
          last_step_sent: scheduledAction.step,
        },
      );

      // Schedule next step
      await this.scheduleNextStep(scheduledAction.conversation);

      this.logger.log(`Successfully processed action ${scheduledActionId}`);
      return { status: 'completed', scheduledActionId };
    } catch (error) {
      this.logger.error(
        `Failed to process scheduled action ${scheduledActionId}: ${error.message}`,
        error.stack,
      );
      await this.scheduledActionRepository.update(scheduledActionId, {
        status: ScheduledActionStatus.FAILED,
      });
      throw error; // Re-throw to mark job as failed in BullMQ
    }
  }

  private async handleEmailAction(action: ScheduledAction): Promise<void> {
    const { conversation, step, email_sender } = action;
    const recipientEmail = conversation.person.email;

    if (!recipientEmail) {
      throw new Error(
        `Person ${conversation.person.id} has no email address for action ${action.id}`,
      );
    }

    if (!email_sender) {
      throw new Error(`Email sender not found for action ${action.id}`);
    }

    // TODO: Implement template rendering with variables
    const subject = step.subject_template || 'No Subject';
    const body = step.body_template || 'No Body';

    this.logger.log(
      `Sending email to ${recipientEmail} from ${email_sender.from_email}`,
    );

    // Use sender-specific API key if available, otherwise use default
    const sendGridApiKey =
      email_sender.sendgrid_key ||
      this.configService.get<string>('SENDGRID_API_KEY');

    if (!sendGridApiKey) {
      throw new Error(`No SendGrid API key configured for action ${action.id}`);
    }

    const client = new SendGridClient(sendGridApiKey);

    await client.sendSimpleEmail({
      to: recipientEmail,
      from: { email: email_sender.from_email, name: email_sender.from_name },
      subject: subject,
      text: body,
      // html: '...', // Add HTML if available
    });

    // Create a new Message record for audit trail
    const message = this.messageRepository.create({
      conversation: conversation,
      sender: 'agent', // Sent by our system
      content: `Subject: ${subject}\n\n${body}`,
      source_template: step,
    });
    await this.messageRepository.save(message);
  }

  private async scheduleNextStep(conversation: Conversation): Promise<void> {
    const currentStepDayOffset = conversation.last_step_sent?.day_offset || -1;

    // Find the next step in the sequence
    const nextStep = await this.stepTemplateRepository.findOne({
      where: {
        sequence: { id: conversation.sequence.id },
        day_offset: MoreThanOrEqual(currentStepDayOffset),
      },
      order: {
        day_offset: 'ASC',
      },
    });

    if (nextStep) {
      this.logger.log(
        `Scheduling next step ${nextStep.id} for conversation ${conversation.id}`,
      );

      // Calculate next action date
      const nextActionDate = new Date();
      nextActionDate.setDate(
        nextActionDate.getDate() + (nextStep.day_offset - currentStepDayOffset),
      );

      // TODO: Implement timezone-aware scheduling
      // TODO: Implement sender selection logic (round-robin, least used, etc.)

      // For now, use the first available email sender
      const defaultEmailSender = await this.emailSenderRepository.findOne({
        where: { organization: { id: conversation.person.organization.id } },
      });

      if (!defaultEmailSender) {
        this.logger.error(
          `No email sender found for organization ${conversation.person.organization.id}. Cannot schedule next step.`,
        );
        await this.conversationRepository.update(conversation.id, {
          automation_status: ConversationAutomationStatus.NEEDS_REVIEW,
        });
        return;
      }

      const newAction = this.scheduledActionRepository.create({
        conversation: conversation,
        step: nextStep,
        channel: nextStep.channel as ScheduledActionChannel,
        action_type: ScheduledActionType.SEND_MESSAGE,
        scheduled_at: nextActionDate,
        status: ScheduledActionStatus.PENDING,
        email_sender: defaultEmailSender,
      });

      await this.scheduledActionRepository.save(newAction);

      // Update conversation's next_action_at
      await this.conversationRepository.update(conversation.id, {
        next_action_at: nextActionDate,
      });
    } else {
      this.logger.log(
        `No more steps for conversation ${conversation.id}. Marking as completed.`,
      );
      await this.conversationRepository.update(conversation.id, {
        automation_status: ConversationAutomationStatus.COMPLETED,
        next_action_at: null,
      });
    }
  }
}
