import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendGridWebhookGuard } from './guards/sendgrid-webhook.guard';
import { SendGridWebhookDto } from './dto/sendgrid-webhook.dto';
import { AimfoxWebhookGuard } from './guards/aimfox-webhook.guard';
import {
  AimfoxWebhookDto,
  AimfoxWebhookBatchDto,
} from './dto/aimfox-webhook.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('sendgrid/webhook')
  @UseGuards(SendGridWebhookGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  handleSendGridWebhook(@Body() webhookDto: SendGridWebhookDto) {
    // SendGrid expects a 2xx response quickly to avoid retries
    // Process events asynchronously to ensure fast response
    setImmediate(() => {
      this.notificationsService
        .processSendGridEvents(webhookDto)
        .catch((error) => {
          // Log error but don't throw - we've already responded to SendGrid
          console.error('Error processing SendGrid webhook:', error);
        });
    });

    // Return immediately with 204 No Content
    return;
  }

  @Post('aimfox/webhook')
  @UseGuards(AimfoxWebhookGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  handleAimfoxWebhook(
    @Body() webhookDto: AimfoxWebhookDto | AimfoxWebhookBatchDto,
  ) {
    // Aimfox expects a quick 2xx response to avoid retries
    // Process events asynchronously to ensure fast response
    setImmediate(() => {
      try {
        this.notificationsService.processAimfoxEvents(webhookDto);
      } catch (error) {
        // Log error but don't throw - we've already responded to Aimfox
        console.error('Error processing Aimfox webhook:', error);
      }
    });

    // Return immediately with 204 No Content
    return;
  }

  @Post('email/send')
  sendEmail(@Body() sendEmailDto: SendEmailDto) {
    return this.notificationsService.sendEmail(sendEmailDto);
  }

  @Get('linkedin-profile/:leadId')
  getLinkedinProfile(@Param('leadId') leadId: string) {
    return this.notificationsService.getLinkedinProfile(leadId);
  }

  @Get('leads/search')
  searchLeads(
    @Query('name') name: string,
    @Query('page') page?: string,
    @Query('count') count?: string,
  ) {
    if (!name) {
      throw new BadRequestException('Query parameter "name" is required');
    }
    return this.notificationsService.searchLeadsByName(
      name,
      page ? Number(page) : 1,
      count ? Number(count) : 10,
    );
  }

  @Post('leads/:leadId/message')
  sendMessageToLead(
    @Param('leadId') leadId: string,
    @Body('accountId') accountId: string,
    @Body('message') message: string,
  ) {
    if (!accountId || !message) {
      throw new BadRequestException(
        'Both accountId and message are required in the body',
      );
    }
    return this.notificationsService.sendMessageToLead(
      accountId,
      leadId,
      message,
    );
  }
}
