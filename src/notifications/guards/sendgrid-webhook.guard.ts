import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventWebhook, EventWebhookHeader } from '@sendgrid/eventwebhook';

@Injectable()
export class SendGridWebhookGuard implements CanActivate {
  private readonly logger = new Logger(SendGridWebhookGuard.name);
  private readonly eventWebhook: EventWebhook;
  private readonly webhookVerificationKey: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookVerificationKey = this.configService.get<string>(
      'SENDGRID_WEBHOOK_VERIFICATION_KEY',
      '',
    );
    
    if (!this.webhookVerificationKey) {
      this.logger.warn(
        'SENDGRID_WEBHOOK_VERIFICATION_KEY is not set. Webhook verification is disabled.',
      );
    }
    
    this.eventWebhook = new EventWebhook();
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.webhookVerificationKey) {
      // In production, this should be a hard failure
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'SENDGRID_WEBHOOK_VERIFICATION_KEY is not set in production. Denying webhook access.',
        );
        throw new UnauthorizedException(
          'Webhook verification key not configured',
        );
      }
      this.logger.warn(
        'Bypassing SendGrid webhook verification. This should not happen in production.',
      );
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const signature = request.headers[EventWebhookHeader.SIGNATURE];
    const timestamp = request.headers[EventWebhookHeader.TIMESTAMP];
    const rawBody = request.rawBody;

    if (!signature || !timestamp || !rawBody) {
      this.logger.warn('Missing SendGrid webhook headers or body');
      throw new UnauthorizedException(
        'Missing required webhook verification headers',
      );
    }

    try {
      const payload = rawBody.toString('utf8');
      const verified = this.eventWebhook.verifySignature(
        this.eventWebhook.convertPublicKeyToECDSA(this.webhookVerificationKey),
        payload,
        signature,
        timestamp,
      );

      if (!verified) {
        this.logger.warn('Invalid SendGrid webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }

      return true;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      throw new UnauthorizedException('Webhook verification failed');
    }
  }
}
