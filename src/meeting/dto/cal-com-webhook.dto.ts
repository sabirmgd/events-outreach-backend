import { IsNotEmpty, IsUrl, IsDateString } from 'class-validator';

export class CalComWebhookDto {
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsUrl()
  @IsNotEmpty()
  videoCallUrl: string;
}
