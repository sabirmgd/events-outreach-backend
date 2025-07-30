import {
  IsString,
  IsEmail,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SendGridEventType {
  PROCESSED = 'processed',
  DROPPED = 'dropped',
  DELIVERED = 'delivered',
  DEFERRED = 'deferred',
  BOUNCE = 'bounce',
  OPEN = 'open',
  CLICK = 'click',
  SPAM_REPORT = 'spamreport',
  UNSUBSCRIBE = 'unsubscribe',
  GROUP_UNSUBSCRIBE = 'group_unsubscribe',
  GROUP_RESUBSCRIBE = 'group_resubscribe',
}

export class SendGridEvent {
  @IsEmail()
  email: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  @IsIn(Object.values(SendGridEventType))
  event: SendGridEventType;

  @IsString()
  @IsOptional()
  sg_event_id?: string;

  @IsString()
  @IsOptional()
  sg_message_id?: string;

  @IsString()
  @IsOptional()
  sg_template_id?: string;

  @IsString()
  @IsOptional()
  sg_template_name?: string;

  // Tracking data
  @IsString()
  @IsOptional()
  useragent?: string;

  @IsString()
  @IsOptional()
  ip?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsNumber()
  @IsOptional()
  url_offset?: { index: number; type: string };

  // Bounce/Drop specific
  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  type?: string;

  // Deferred specific
  @IsNumber()
  @IsOptional()
  attempt?: number;

  // Category and marketing data
  @IsArray()
  @IsOptional()
  category?: string[];

  @IsString()
  @IsOptional()
  marketing_campaign_id?: string;

  @IsString()
  @IsOptional()
  marketing_campaign_name?: string;

  // ASM (Advanced Suppression Manager) data
  @IsNumber()
  @IsOptional()
  asm_group_id?: number;

  // SMTP data
  @IsString()
  @IsOptional()
  'smtp-id'?: string;

  @IsString()
  @IsOptional()
  response?: string;

  // TLS data
  @IsBoolean()
  @IsOptional()
  tls?: boolean;

  @IsString()
  @IsOptional()
  cert_err?: string;

  // Additional metadata
  @IsOptional()
  unique_args?: Record<string, any>;

  @IsOptional()
  newsletter?: {
    newsletter_user_list_id: string;
    newsletter_id: string;
    newsletter_send_id: string;
  };

  // Pool data
  @IsString()
  @IsOptional()
  pool?: {
    name: string;
    id: number;
  };

  // Allow additional properties for forward compatibility
  [key: string]: any;
}

export class SendGridWebhookDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendGridEvent)
  events: SendGridEvent[];
}
