import {
  IsString,
  IsEmail,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsIn,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TargetProfile } from '../../clients/aimfox.types';

export enum AimfoxWebhookEventType {
  ACCOUNT_LOGGED_IN = 'account_logged_in',
  ACCOUNT_LOGGED_OUT = 'account_logged_out',
  NEW_CONNECTION = 'new_connection',
  VIEW = 'view',
  CONNECT = 'connect',
  ACCEPTED = 'accepted',
  INMAIL = 'inmail',
  MESSAGE_REQUEST = 'message_request',
  MESSAGE = 'message',
  REPLY = 'reply',
  INMAIL_REPLY = 'inmail_reply',
}

// Base event structure for all Aimfox webhook events
export class AimfoxWebhookEvent {
  @IsString()
  event_id: string;

  @IsString()
  @IsIn(Object.values(AimfoxWebhookEventType))
  event_type: AimfoxWebhookEventType;

  @IsNumber()
  timestamp: number;

  @IsString()
  workspace_id: string;

  @IsString()
  account_id: string;

  @IsString()
  @IsOptional()
  webhook_id?: string;

  @IsString()
  @IsOptional()
  webhook_name?: string;
}

// Account events
export class AccountLoggedInEvent extends AimfoxWebhookEvent {
  @IsString()
  account_urn: string;

  @IsString()
  account_name: string;

  @IsEmail()
  @IsOptional()
  account_email?: string;

  @IsString()
  @IsOptional()
  session_id?: string;
}

export class AccountLoggedOutEvent extends AimfoxWebhookEvent {
  @IsString()
  account_urn: string;

  @IsString()
  account_name: string;

  @IsString()
  @IsOptional()
  reason?: string; // manual, expired, error
}

// Connection events
export class ConnectionEvent extends AimfoxWebhookEvent {
  @IsString()
  target_id: string;

  @IsString()
  target_urn: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  target: Partial<TargetProfile>;

  @IsString()
  @IsOptional()
  campaign_id?: string;

  @IsString()
  @IsOptional()
  campaign_name?: string;

  @IsString()
  @IsOptional()
  flow_id?: string;

  @IsString()
  @IsOptional()
  template_id?: string;

  @IsString()
  @IsOptional()
  message?: string;
}

export class ViewEvent extends AimfoxWebhookEvent {
  @IsString()
  viewer_id: string;

  @IsString()
  viewer_urn: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  viewer: Partial<TargetProfile>;

  @IsString()
  @IsOptional()
  viewer_occupation?: string;

  @IsString()
  @IsOptional()
  viewer_company?: string;
}

// Message events
export class MessageEvent extends AimfoxWebhookEvent {
  @IsString()
  conversation_urn: string;

  @IsString()
  message_urn: string;

  @IsString()
  sender_id: string;

  @IsString()
  sender_urn: string;

  @IsString()
  sender_name: string;

  @IsString()
  @IsOptional()
  recipient_id?: string;

  @IsString()
  @IsOptional()
  recipient_urn?: string;

  @IsString()
  @IsOptional()
  recipient_name?: string;

  @IsString()
  message_body: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsBoolean()
  @IsOptional()
  is_inmail?: boolean;

  @IsString()
  @IsOptional()
  campaign_id?: string;

  @IsString()
  @IsOptional()
  campaign_name?: string;

  @IsString()
  @IsOptional()
  flow_id?: string;

  @IsString()
  @IsOptional()
  template_id?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  sender?: Partial<TargetProfile>;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  recipient?: Partial<TargetProfile>;
}

// Reply events extend message events
export class ReplyEvent extends MessageEvent {
  @IsString()
  @IsOptional()
  original_message_urn?: string;

  @IsString()
  @IsOptional()
  original_sender_id?: string;

  @IsNumber()
  @IsOptional()
  reply_time_seconds?: number; // Time taken to reply in seconds
}

// InMail specific events
export class InMailEvent extends MessageEvent {
  @IsBoolean()
  declare is_inmail: true;

  @IsNumber()
  @IsOptional()
  inmail_credits_used?: number;
}

export class InMailReplyEvent extends ReplyEvent {
  @IsBoolean()
  declare is_inmail: true;
}

// Union type for all possible webhook events
export type AimfoxWebhookEventData =
  | AccountLoggedInEvent
  | AccountLoggedOutEvent
  | ConnectionEvent
  | ViewEvent
  | MessageEvent
  | ReplyEvent
  | InMailEvent
  | InMailReplyEvent;

// Main webhook payload DTO
export class AimfoxWebhookDto {
  @IsString()
  webhook_id: string;

  @IsString()
  workspace_id: string;

  @IsString()
  @IsOptional()
  signature?: string; // For webhook verification

  @IsNumber()
  timestamp: number;

  @IsString()
  @IsIn(Object.values(AimfoxWebhookEventType))
  event_type: AimfoxWebhookEventType;

  @IsObject()
  @ValidateNested()
  @Type(() => Object) // We'll validate the specific type in the service
  data: AimfoxWebhookEventData;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

// Batch webhook events DTO (if Aimfox sends multiple events)
export class AimfoxWebhookBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AimfoxWebhookDto)
  events: AimfoxWebhookDto[];
}
