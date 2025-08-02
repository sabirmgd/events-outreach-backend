import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ClientsModule } from '../clients/clients.module';
import { SendGridWebhookGuard } from './guards/sendgrid-webhook.guard';
import { AimfoxWebhookGuard } from './guards/aimfox-webhook.guard';
import { AimfoxWebhookHelper } from './aimfox.helper';

@Module({
  imports: [ClientsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    SendGridWebhookGuard,
    AimfoxWebhookGuard,
    AimfoxWebhookHelper,
  ],
})
export class NotificationsModule {}
