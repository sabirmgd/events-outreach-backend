// SendGrid Email Object Types
export interface EmailObject {
  email: string;
  name?: string;
}

// Content Object
export interface ContentObject {
  type: string;
  value: string;
}

// Attachment Object
export interface AttachmentObject {
  content: string; // Base64 encoded content
  type?: string;
  filename: string;
  disposition?: 'inline' | 'attachment';
  content_id?: string;
}

// Substitutions
export interface Substitutions {
  [key: string]: string;
}

// Dynamic Template Data
export interface DynamicTemplateData {
  [key: string]: any;
}

// Custom Args
export interface CustomArgs {
  [key: string]: string;
}

// Headers
export interface Headers {
  [key: string]: string;
}

// Personalization Object
export interface PersonalizationObject {
  to: EmailObject[];
  cc?: EmailObject[];
  bcc?: EmailObject[];
  subject?: string;
  headers?: Headers;
  substitutions?: Substitutions;
  dynamic_template_data?: DynamicTemplateData;
  custom_args?: CustomArgs;
  send_at?: number;
  from?: EmailObject;
}

// ASM (Advanced Suppression Manager)
export interface ASM {
  group_id: number;
  groups_to_display?: number[];
}

// Bypass Settings
export interface BypassSetting {
  enable?: boolean;
}

// Footer Setting
export interface FooterSetting {
  enable?: boolean;
  text?: string;
  html?: string;
}

// Click Tracking
export interface ClickTracking {
  enable?: boolean;
  enable_text?: boolean;
}

// Open Tracking
export interface OpenTracking {
  enable?: boolean;
  substitution_tag?: string;
}

// Subscription Tracking
export interface SubscriptionTracking {
  enable?: boolean;
  text?: string;
  html?: string;
  substitution_tag?: string;
}

// Google Analytics
export interface GoogleAnalytics {
  enable?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_term?: string;
  utm_content?: string;
  utm_campaign?: string;
}

// Mail Settings
export interface MailSettings {
  bypass_list_management?: BypassSetting;
  bypass_spam_management?: BypassSetting;
  bypass_bounce_management?: BypassSetting;
  bypass_unsubscribe_management?: BypassSetting;
  footer?: FooterSetting;
  sandbox_mode?: BypassSetting;
}

// Tracking Settings
export interface TrackingSettings {
  click_tracking?: ClickTracking;
  open_tracking?: OpenTracking;
  subscription_tracking?: SubscriptionTracking;
  ganalytics?: GoogleAnalytics;
}

// Main Mail Send Request
export interface MailSendRequest {
  personalizations: PersonalizationObject[];
  from: EmailObject;
  reply_to?: EmailObject;
  reply_to_list?: EmailObject[];
  subject?: string;
  content?: ContentObject[];
  attachments?: AttachmentObject[];
  template_id?: string;
  headers?: Headers;
  categories?: string[];
  custom_args?: CustomArgs;
  send_at?: number;
  batch_id?: string;
  asm?: ASM;
  ip_pool_name?: string;
  mail_settings?: MailSettings;
  tracking_settings?: TrackingSettings;
}

// Simple Email Send Request (for convenience)
export interface SimpleEmailRequest {
  to: string | string[] | EmailObject | EmailObject[];
  from?: string | EmailObject;
  subject?: string;
  text?: string;
  html?: string;
  cc?: string | string[] | EmailObject | EmailObject[];
  bcc?: string | string[] | EmailObject | EmailObject[];
  attachments?: AttachmentObject[];
  template_id?: string;
  dynamic_template_data?: DynamicTemplateData;
  substitutions?: Substitutions;
  custom_args?: CustomArgs;
  headers?: Headers;
  categories?: string[];
  send_at?: number;
  reply_to?: string | EmailObject;
  asm?: ASM;
  mail_settings?: MailSettings;
  tracking_settings?: TrackingSettings;
}

// Bulk Email Request
export interface BulkEmailRequest {
  personalizations: PersonalizationObject[];
  from?: string | EmailObject;
  subject?: string;
  text?: string;
  html?: string;
  template_id?: string;
  attachments?: AttachmentObject[];
  custom_args?: CustomArgs;
  headers?: Headers;
  categories?: string[];
  send_at?: number;
  reply_to?: string | EmailObject;
  asm?: ASM;
  mail_settings?: MailSettings;
  tracking_settings?: TrackingSettings;
}

// Response Types
export interface SendGridError {
  message: string;
  field?: string | null;
  help?: any;
  id?: string;
}

export interface SendGridErrorResponse {
  errors: SendGridError[];
}

export interface SendGridSuccessResponse {
  message_id?: string;
}

// Template Types
export interface Template {
  id: string;
  name: string;
  generation: 'legacy' | 'dynamic';
  updated_at: string;
  versions?: TemplateVersion[];
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  active: number;
  name: string;
  html_content?: string;
  plain_content?: string;
  generate_plain_content: boolean;
  subject: string;
  updated_at: string;
  editor: string;
  test_data?: string;
}

export interface CreateTemplateRequest {
  name: string;
  generation?: 'legacy' | 'dynamic';
}

export interface CreateTemplateVersionRequest {
  template_id: string;
  name: string;
  subject: string;
  html_content?: string;
  plain_content?: string;
  generate_plain_content?: boolean;
  editor?: string;
  test_data?: string;
}

// API Key Types
export interface ApiKey {
  api_key_id: string;
  name: string;
  scopes: string[];
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
}

export interface UpdateApiKeyRequest {
  name?: string;
  scopes?: string[];
}

// Sender Verification Types
export interface SenderIdentity {
  id: number;
  nickname: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
  reply_to_name?: string;
  address: string;
  address_2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  verified: boolean;
  locked: boolean;
}

export interface CreateSenderRequest {
  nickname: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
  reply_to_name?: string;
  address: string;
  address_2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
}

// Statistics Types
export interface EmailStats {
  date: string;
  stats: {
    type: string;
    name: string;
    metrics: {
      blocks: number;
      bounce_drops: number;
      bounces: number;
      clicks: number;
      deferred: number;
      delivered: number;
      invalid_emails: number;
      opens: number;
      processed: number;
      requests: number;
      spam_report_drops: number;
      spam_reports: number;
      unique_clicks: number;
      unique_opens: number;
      unsubscribe_drops: number;
      unsubscribes: number;
    };
  }[];
}

export interface StatsQuery {
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  aggregated_by?: 'day' | 'week' | 'month';
  limit?: number;
  offset?: number;
}

// Webhook Event Types
export interface WebhookEvent {
  email: string;
  timestamp: number;
  event:
    | 'processed'
    | 'deferred'
    | 'delivered'
    | 'open'
    | 'click'
    | 'bounce'
    | 'dropped'
    | 'spamreport'
    | 'unsubscribe'
    | 'group_unsubscribe'
    | 'group_resubscribe';
  smtp_id?: string;
  category?: string[];
  sg_event_id: string;
  sg_message_id: string;
  useragent?: string;
  ip?: string;
  url?: string;
  reason?: string;
  status?: string;
  response?: string;
  attempt?: string;
  type?: string;
  asm_group_id?: number;
}

// Suppression Types
export interface SuppressionGroup {
  id: number;
  name: string;
  description: string;
  last_email_sent_at?: string;
  is_default: boolean;
  unsubscribes: number;
}

export interface CreateSuppressionGroupRequest {
  name: string;
  description: string;
  is_default?: boolean;
}

export interface GlobalSuppression {
  email: string;
  created: number;
}

export interface Bounce {
  created: number;
  email: string;
  reason: string;
  status: string;
}

export interface SpamReport {
  created: number;
  email: string;
  ip: string;
}

export interface Block {
  created: number;
  email: string;
  reason: string;
  status: string;
}

export interface InvalidEmail {
  created: number;
  email: string;
  reason: string;
}
