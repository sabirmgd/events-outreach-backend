import { Injectable, Logger } from '@nestjs/common';
import {
  AimfoxWebhookDto,
  AimfoxWebhookBatchDto,
  AimfoxWebhookEventType,
  AccountLoggedInEvent,
  AccountLoggedOutEvent,
  ConnectionEvent,
  ViewEvent,
  MessageEvent,
  ReplyEvent,
  InMailEvent,
  InMailReplyEvent,
  AimfoxWebhookEventData,
} from './dto/aimfox-webhook.dto';

@Injectable()
export class AimfoxWebhookHelper {
  private readonly logger = new Logger(AimfoxWebhookHelper.name);

  /**
   * Process a single Aimfox webhook event or batch of events
   */
  processWebhookEvents(
    payload: AimfoxWebhookDto | AimfoxWebhookBatchDto,
  ): void {
    try {
      // Check if it's a batch or single event
      if ('events' in payload) {
        // Process batch
        this.logger.log(
          `Processing batch of ${payload.events.length} Aimfox webhook events`,
        );

        // Process each event
        for (const event of payload.events) {
          try {
            this.processIndividualEvent(event);
          } catch (error) {
            // Log error but continue processing other events
            this.logger.error(
              `Failed to process event ${event.event_type}: ${error}`,
            );
          }
        }
      } else {
        // Process single event
        this.processIndividualEvent(payload);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error processing Aimfox webhook events: ${errorMessage}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process an individual webhook event
   */
  private processIndividualEvent(event: AimfoxWebhookDto): void {
    try {
      this.logger.log(
        `Processing ${event.event_type} event for workspace ${event.workspace_id} ` +
          `(Event ID: ${event.data.event_id})`,
      );

      switch (event.event_type) {
        case AimfoxWebhookEventType.ACCOUNT_LOGGED_IN:
          this.handleAccountLoggedIn(event.data as AccountLoggedInEvent);
          break;

        case AimfoxWebhookEventType.ACCOUNT_LOGGED_OUT:
          this.handleAccountLoggedOut(event.data as AccountLoggedOutEvent);
          break;

        case AimfoxWebhookEventType.NEW_CONNECTION:
        case AimfoxWebhookEventType.CONNECT:
        case AimfoxWebhookEventType.ACCEPTED:
          this.handleConnectionEvent(
            event.data as ConnectionEvent,
            event.event_type,
          );
          break;

        case AimfoxWebhookEventType.VIEW:
          this.handleViewEvent(event.data as ViewEvent);
          break;

        case AimfoxWebhookEventType.MESSAGE:
        case AimfoxWebhookEventType.MESSAGE_REQUEST:
          this.handleMessageEvent(event.data as MessageEvent);
          break;

        case AimfoxWebhookEventType.REPLY:
          this.handleReplyEvent(event.data as ReplyEvent);
          break;

        case AimfoxWebhookEventType.INMAIL:
          this.handleInMailEvent(event.data as InMailEvent);
          break;

        case AimfoxWebhookEventType.INMAIL_REPLY:
          this.handleInMailReplyEvent(event.data as InMailReplyEvent);
          break;

        default:
          this.logger.warn(`Unknown event type: ${event.event_type as string}`);
      }

      // Log successful processing
      this.logger.debug(
        `Successfully processed ${event.event_type} event ${event.data.event_id}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error processing ${event.event_type} event: ${errorMessage}`,
        errorStack,
      );

      // In production, you might want to:
      // - Send to a dead letter queue
      // - Store failed events for retry
      // - Send alerts for critical failures
      throw error;
    }
  }

  /**
   * Handle account logged in event
   */
  private handleAccountLoggedIn(event: AccountLoggedInEvent): void {
    this.logger.log(
      `Account logged in: ${event.account_name} (${event.account_urn}) ` +
        `at ${new Date(event.timestamp * 1000).toISOString()}`,
    );

    // TODO: Implement business logic
    // - Update account status in database
    // - Log session information
    // - Trigger welcome workflows
    // - Check for pending campaigns
    // - Send notifications if needed
  }

  /**
   * Handle account logged out event
   */
  private handleAccountLoggedOut(event: AccountLoggedOutEvent): void {
    this.logger.log(
      `Account logged out: ${event.account_name} (${event.account_urn}) ` +
        `Reason: ${event.reason || 'manual'}`,
    );

    // TODO: Implement business logic
    // - Update account status
    // - Pause active campaigns
    // - Log session end
    // - Clean up temporary data
    // - Alert if unexpected logout
  }

  /**
   * Handle connection events (new connection, connect request, accepted)
   */
  private handleConnectionEvent(
    event: ConnectionEvent,
    eventType: AimfoxWebhookEventType,
  ): void {
    this.logger.log(
      `Connection event (${eventType}): ${event.target.full_name} ` +
        `Campaign: ${event.campaign_name || 'Direct'} ` +
        `Target: ${event.target_urn}`,
    );

    // TODO: Implement business logic based on event type
    switch (eventType) {
      case AimfoxWebhookEventType.NEW_CONNECTION:
        // New connection established
        // - Update contact status
        // - Trigger follow-up sequences
        // - Update campaign metrics
        break;

      case AimfoxWebhookEventType.CONNECT:
        // Connection request sent
        // - Log outreach attempt
        // - Update daily limits
        // - Track campaign progress
        break;

      case AimfoxWebhookEventType.ACCEPTED:
        // Connection request accepted
        // - Update contact relationship
        // - Calculate acceptance rate
        // - Trigger next campaign step
        // - Send internal notifications
        break;
    }
  }

  /**
   * Handle profile view event
   */
  private handleViewEvent(event: ViewEvent): void {
    this.logger.log(
      `Profile viewed by: ${event.viewer.full_name} ` +
        `(${event.viewer_occupation} at ${event.viewer_company})`,
    );

    // TODO: Implement business logic
    // - Track profile views
    // - Identify potential leads
    // - Trigger engagement campaigns
    // - Send notifications for important viewers
    // - Update lead scoring
  }

  /**
   * Handle message event
   */
  private handleMessageEvent(event: MessageEvent): void {
    this.logger.log(
      `Message from ${event.sender_name}: "${event.message_body.substring(0, 50)}..." ` +
        `Campaign: ${event.campaign_name || 'Direct'}`,
    );

    // TODO: Implement business logic
    // - Store message in database
    // - Update conversation thread
    // - Trigger auto-responses if configured
    // - Notify sales team
    // - Update engagement metrics
    // - Check for keywords/intents
  }

  /**
   * Handle reply event
   */
  private handleReplyEvent(event: ReplyEvent): void {
    const replyTime = event.reply_time_seconds
      ? `${Math.round(event.reply_time_seconds / 60)} minutes`
      : 'unknown';

    this.logger.log(
      `Reply received from ${event.sender_name} after ${replyTime}: ` +
        `"${event.message_body.substring(0, 50)}..."`,
    );

    // TODO: Implement business logic
    // - Update conversation status
    // - Calculate response rates
    // - Trigger follow-up sequences
    // - Notify assigned team member
    // - Update lead score based on engagement
    // - Analyze sentiment if needed
  }

  /**
   * Handle InMail event
   */
  private handleInMailEvent(event: InMailEvent): void {
    this.logger.log(
      `InMail sent to ${event.recipient_name}: "${event.subject || 'No subject'}" ` +
        `Credits used: ${event.inmail_credits_used || 1}`,
    );

    // TODO: Implement business logic
    // - Track InMail usage and credits
    // - Update campaign costs
    // - Monitor InMail limits
    // - Store for compliance
    // - Update outreach metrics
  }

  /**
   * Handle InMail reply event
   */
  private handleInMailReplyEvent(event: InMailReplyEvent): void {
    this.logger.log(
      `InMail reply from ${event.sender_name}: ` +
        `"${event.message_body.substring(0, 50)}..."`,
    );

    // TODO: Implement business logic
    // - Higher priority for InMail replies
    // - Update conversion metrics
    // - Notify sales team immediately
    // - Calculate InMail ROI
    // - Trigger premium follow-up sequences
  }

  /**
   * Batch events for efficient processing
   */
  private batchEvents<T>(events: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Helper method to extract key metrics from events
   */
  getEventMetrics(event: AimfoxWebhookEventData): {
    eventType: string;
    accountId: string;
    timestamp: Date;
    campaignId?: string;
    targetId?: string;
  } {
    return {
      eventType: event.event_type,
      accountId: event.account_id,
      timestamp: new Date(event.timestamp * 1000),
      campaignId: 'campaign_id' in event ? event.campaign_id : undefined,
      targetId: 'target_id' in event ? event.target_id : undefined,
    };
  }

  /**
   * Validate event data structure
   */
  validateEventData(event: AimfoxWebhookEventData): boolean {
    // Add custom validation logic here
    if (!event.event_id || !event.event_type || !event.timestamp) {
      return false;
    }

    // Validate timestamp is reasonable (not too old or in future)
    const eventTime = new Date(event.timestamp * 1000);
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);
    const hourFromNow = new Date(now.getTime() + 3600000);

    if (eventTime < hourAgo || eventTime > hourFromNow) {
      this.logger.warn(
        `Event timestamp outside reasonable range: ${eventTime.toISOString()}`,
      );
      return false;
    }

    return true;
  }
}
