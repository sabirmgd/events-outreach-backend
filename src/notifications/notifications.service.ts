import { Injectable, Logger } from '@nestjs/common';
import {
  GetLeadDetailsResponse,
  SearchLeadsResponse,
  StartConversationResponse,
  StartConversationRequest,
  StatusOkResponse,
} from '../clients/aimfox.types';
import { AimfoxClient } from '../clients/aimfox.client';
import { SendGridClient } from '../clients/sendgrid.client';
import { SendEmailDto } from './dto/send-email.dto';
import {
  SendGridWebhookDto,
  SendGridEvent,
  SendGridEventType,
} from './dto/sendgrid-webhook.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly aimfoxClient: AimfoxClient,
    private readonly sendGridClient: SendGridClient,
  ) {}

  async processSendGridEvents(webhookDto: SendGridWebhookDto): Promise<void> {
    this.logger.log(
      `Processing ${webhookDto.events.length} SendGrid webhook events`,
    );

    // Process events in batches for better performance
    const eventBatches = this.batchEvents(webhookDto.events, 10);

    for (const batch of eventBatches) {
      await Promise.all(
        batch.map((event) => this.processIndividualEvent(event)),
      );
    }
  }

  private processIndividualEvent(event: SendGridEvent): void {
    try {
      this.logger.log(
        `Processing ${event.event} event for ${event.email} ` +
          `(ID: ${event.sg_event_id}, Message: ${event.sg_message_id})`,
      );

      switch (event.event) {
        case SendGridEventType.PROCESSED:
          this.handleProcessedEvent(event);
          break;
        case SendGridEventType.DELIVERED:
          this.handleDeliveredEvent(event);
          break;
        case SendGridEventType.BOUNCE:
          this.handleBounceEvent(event);
          break;
        case SendGridEventType.DROPPED:
          this.handleDroppedEvent(event);
          break;
        case SendGridEventType.DEFERRED:
          this.handleDeferredEvent(event);
          break;
        case SendGridEventType.OPEN:
          this.handleOpenEvent(event);
          break;
        case SendGridEventType.CLICK:
          this.handleClickEvent(event);
          break;
        case SendGridEventType.SPAM_REPORT:
          this.handleSpamReportEvent(event);
          break;
        case SendGridEventType.UNSUBSCRIBE:
          this.handleUnsubscribeEvent(event);
          break;
        case SendGridEventType.GROUP_UNSUBSCRIBE:
        case SendGridEventType.GROUP_RESUBSCRIBE:
          this.handleGroupSubscriptionEvent(event);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event.event as string}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error processing ${event.event} event for ${event.email}: ${errorMessage}`,
        errorStack,
      );
      // In production, you might want to send this to a dead letter queue
      // or retry mechanism
    }
  }

  private handleProcessedEvent(event: SendGridEvent): void {
    this.logger.debug(`Email processed: ${event.email}`);
    // TODO: Update email status in database to 'processed'
  }

  private handleDeliveredEvent(event: SendGridEvent): void {
    this.logger.log(
      `Email delivered: ${event.email} at ${new Date(event.timestamp * 1000).toISOString()}`,
    );
    // TODO: Update email status in database to 'delivered'
    // TODO: Update delivery timestamp
    // TODO: Track delivery metrics
  }

  private handleBounceEvent(event: SendGridEvent): void {
    this.logger.warn(
      `Email bounced: ${event.email} - Type: ${event.type}, Reason: ${event.reason}`,
    );
    // TODO: Update email status in database to 'bounced'
    // TODO: Handle hard vs soft bounces differently
    // TODO: Update contact as invalid if hard bounce
    // TODO: Implement retry logic for soft bounces
  }

  private handleDroppedEvent(event: SendGridEvent): void {
    this.logger.warn(`Email dropped: ${event.email} - Reason: ${event.reason}`);
    // TODO: Update email status in database to 'dropped'
    // TODO: Log the reason for analysis
    // TODO: Alert if drop rate is high
  }

  private handleDeferredEvent(event: SendGridEvent): void {
    this.logger.log(
      `Email deferred: ${event.email} - Attempt: ${event.attempt}, Response: ${event.response}`,
    );
    // TODO: Track deferral attempts
    // TODO: Alert if too many deferrals
  }

  private handleOpenEvent(event: SendGridEvent): void {
    this.logger.log(`Email opened: ${event.email} from IP: ${event.ip}`);
    // TODO: Update engagement metrics
    // TODO: Track open timestamp and user agent
    // TODO: Update lead score based on engagement
  }

  private handleClickEvent(event: SendGridEvent): void {
    this.logger.log(`Link clicked: ${event.email} - URL: ${event.url}`);
    // TODO: Track click metrics
    // TODO: Update engagement score
    // TODO: Trigger follow-up actions based on clicked links
  }

  private handleSpamReportEvent(event: SendGridEvent): void {
    this.logger.error(`Spam report: ${event.email}`);
    // TODO: Immediately add to suppression list
    // TODO: Update contact status
    // TODO: Alert team about spam report
    // TODO: Analyze content that triggered spam report
  }

  private handleUnsubscribeEvent(event: SendGridEvent): void {
    this.logger.warn(`Unsubscribe: ${event.email}`);
    // TODO: Update contact preferences
    // TODO: Add to suppression list
    // TODO: Track unsubscribe reasons if available
  }

  private handleGroupSubscriptionEvent(event: SendGridEvent): void {
    this.logger.log(
      `Group ${event.event}: ${event.email} - Group ID: ${event.asm_group_id}`,
    );
    // TODO: Update group subscription preferences
    // TODO: Track subscription changes
  }

  private batchEvents(
    events: SendGridEvent[],
    batchSize: number,
  ): SendGridEvent[][] {
    const batches: SendGridEvent[][] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }
    return batches;
  }

  async sendEmail(sendEmailDto: SendEmailDto) {
    return this.sendGridClient.sendSimpleEmail({
      to: sendEmailDto.to,
      subject: sendEmailDto.subject,
      text: sendEmailDto.text,
      html: sendEmailDto.html,
    });
  }

  async getLinkedinProfile(leadId: string): Promise<GetLeadDetailsResponse> {
    return this.aimfoxClient.getLeadDetails(leadId);
  }

  async searchLeadsByName(
    name: string,
    page = 1,
    count = 10,
  ): Promise<SearchLeadsResponse> {
    const data = {
      keywords: name,
    };

    const params = {
      page,
      count,
    };

    return this.aimfoxClient.searchLeads(data, params);
  }

  async sendMessageToLead(
    accountId: string,
    leadId: string,
    message: string,
  ): Promise<StatusOkResponse | StartConversationResponse> {
    try {
      const conv = await this.aimfoxClient.getLeadConversation(
        accountId,
        leadId,
      );
      if (conv.conversation_urn) {
        return this.aimfoxClient.sendMessageToConversation(
          accountId,
          conv.conversation_urn,
          { message },
        );
      }
    } catch {
      // If fetching conversation failed (e.g., 404), we'll start a new one
    }

    // Start a new conversation
    const data = {
      message,
      recipients: [leadId],
    } as StartConversationRequest;

    return this.aimfoxClient.startConversation(accountId, data);
  }
}
