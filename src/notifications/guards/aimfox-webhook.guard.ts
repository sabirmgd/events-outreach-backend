import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AimfoxWebhookGuard implements CanActivate {
  private readonly logger = new Logger(AimfoxWebhookGuard.name);
  private readonly webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.AIMFOX_WEBHOOK_SECRET || '';
    if (!this.webhookSecret) {
      this.logger.warn(
        'AIMFOX_WEBHOOK_SECRET is not configured. Webhook validation is disabled.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.webhookSecret) {
      // If no secret is configured, bypass validation.
      // This is not recommended for production environments.
      this.logger.warn(
        'Bypassing Aimfox webhook validation because AIMFOX_WEBHOOK_SECRET is not set.',
      );
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers['x-aimfox-secret'] as string;

    if (!providedSecret) {
      this.logger.error(
        '`x-aimfox-secret` header is missing from the request.',
      );
      throw new UnauthorizedException('Missing webhook secret.');
    }

    if (providedSecret !== this.webhookSecret) {
      this.logger.error('Invalid webhook secret provided.');
      throw new UnauthorizedException('Invalid webhook secret.');
    }

    this.logger.log('Aimfox webhook secret validated successfully.');
    return true;
  }
}
