import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PerplexityClient } from './perplexity.client';
import { AimfoxClient } from './aimfox.client';
import { SendGridClient } from './sendgrid.client';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    PerplexityClient,
    {
      provide: AimfoxClient,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('AIMFOX_API_KEY', '');
        return new AimfoxClient(apiKey);
      },
      inject: [ConfigService],
    },
    {
      provide: SendGridClient,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('SENDGRID_API_KEY', '');
        const defaultSenderEmail = configService.get<string>(
          'SENDER_EMAIL',
          '',
        );
        return new SendGridClient(apiKey, defaultSenderEmail);
      },
      inject: [ConfigService],
    },
  ],
  exports: [PerplexityClient, AimfoxClient, SendGridClient],
})
export class ClientsModule {}
