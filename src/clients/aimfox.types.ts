export interface AimfoxResponse<T> {
  status: 'ok' | 'fail';
  error?: {
    code: number;
    message: string;
    type: string;
    data?: any;
  };
  data: T;
}

// =============================================================================
// Accounts
// =============================================================================
export interface Account {
  id: number;
  urn: string;
  public_identifier: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  occupation: string;
  picture_url: string;
  premium: boolean;
  first_scraped_at: string;
  last_scraped_at: string;
  state: string;
}

export interface ListAccountsResponse {
  status: string;
  accounts: Account[];
}

export interface AccountLimit {
  id: number;
  connect: number;
  email_connect?: number;
  message_request: number;
  inmail: number;
}

export interface GetAccountLimitsResponse {
  status: string;
  limit: AccountLimit;
}

export type SetAccountLimitsRequest = Partial<
  Pick<AccountLimit, 'connect' | 'message_request' | 'inmail'>
>;

export interface SetAccountLimitsResponse {
  status: string;
  limit: AccountLimit;
}

// =============================================================================
// Analytics
// =============================================================================
export interface RecentLead {
  timestamp: string;
  campaign_id: string;
  flow_id: string;
  target_id: string;
  target_urn: string;
  transition: string;
  template_id: string | null;
  campaign_name: string;
  owner: string;
  target: TargetProfile;
}

export interface ListRecentLeadsResponse {
  status: string;
  leads: RecentLead[];
}

export interface InteractionBucket {
  timestamp: number;
  sent_connections: number;
  accepted_connections: number;
  sent_messages: number;
  sent_inmails: number;
  replies: number;
  views: number;
  message_requests: number;
}

export interface ListInteractionsResponse {
  status: string;
  count: number;
  buckets: InteractionBucket[];
}

export interface ListInteractionsParams {
  bucket: '1 hour' | '1 day';
  from: number; // timestamp in ms
  to: number; // timestamp in ms
  account_ids?: string[];
}

// =============================================================================
// Blacklist
// =============================================================================
export interface BlacklistedProfile {
  id: string;
  full_name: string;
  public_identifier: string;
  picture_url: string;
  occupation: string;
  urn: string;
  location: {
    name: string;
    urn: string;
  };
}

export interface ListBlacklistedProfilesResponse {
  status: string;
  profiles: BlacklistedProfile[];
}

export interface StatusOkResponse {
  status: 'ok';
}

// =============================================================================
// Campaigns
// =============================================================================

export interface CampaignMetrics {
  sent_connections: number;
  accepted_connections: number;
  sent_messages: number;
  replies: number;
  sent_inmails: number;
  views: number;
  message_requests: number;
}

export interface Campaign {
  id: string;
  name: string;
  state: string;
  created_at: number;
  target_count: number;
  type: string;
  outreach_type: string;
  owner: string;
  completion: number;
  metrics: CampaignMetrics;
}

export interface ListCampaignsResponse {
  status: string;
  campaigns: Campaign[];
}

export interface ScheduleInterval {
  start: number;
  end: number;
}

export interface DaySchedule {
  intervals: ScheduleInterval[];
}

export interface CampaignSchedule {
  timezone: {
    name: string | null;
    offset: number | null;
  };
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
}

export interface CampaignFlow {
  id: string;
  translate: boolean;
  source_language: string | null;
  is_manual_language: boolean;
  type: string;
  name: string;
  template: Record<string, unknown> | null;
  flow_message_templates: Record<string, unknown>[];
  metrics: CampaignMetrics;
}

export interface CampaignDetail {
  id: string;
  state: string;
  schedule: CampaignSchedule;
  name: string;
  type: string;
  outreach_type: string;
  inmail_optimization: boolean;
  audience_size: number;
  target_count: number;
  created_at: number;
  completion: number;
  owner: string;
  metrics: CampaignMetrics;
  flows: CampaignFlow[];
}

export interface GetCampaignResponse {
  status: string;
  campaign: CampaignDetail;
}

export interface AddProfileToCampaignRequest {
  profile_url: string;
}

export interface ProfileWithCustomVars {
  profile_url: string;
  custom_variables: Record<string, string>;
}

export interface AddProfilesToCampaignRequest {
  type: 'profile_url';
  profiles: ProfileWithCustomVars[];
}

export interface AddedProfileInfo {
  id: string;
  full_name: string;
  public_identifier: string;
  picture_url: string;
  occupation: string;
  urn: string;
  location: {
    name: string;
    urn: string;
  };
  state: string;
}

export interface AddProfilesToCampaignResponse {
  status: string;
  profiles: AddedProfileInfo[];
  failed: unknown[];
}

export interface UpdateCampaignRequest {
  name?: string;
  state?: 'ACTIVE' | 'PAUSED';
  target_count?: number;
}

export interface UpdateCampaignResponse {
  status: string;
  campaign: Partial<CampaignDetail>;
}

// =============================================================================
// Labels
// =============================================================================
export type LabelColor =
  | 'quaternary'
  | 'secondary'
  | 'danger'
  | 'yellow'
  | 'info'
  | 'success';

export interface Label {
  id: string;
  agency_id: string;
  name: string;
  color: LabelColor;
  count?: number;
}

export interface ListWorkspaceLabelsResponse {
  status: string;
  labels: Label[];
}

export interface AddLabelToWorkspaceRequest {
  name: string;
  color: LabelColor;
}

export interface AddLabelToWorkspaceResponse {
  status: string;
  label: Omit<Label, 'count'>;
}

export type EditWorkspaceLabelRequest = AddLabelToWorkspaceRequest;
export type EditWorkspaceLabelResponse = AddLabelToWorkspaceResponse;

// =============================================================================
// Leads and Notes
// =============================================================================
export interface Note {
  id: string;
  text: string;
  created_at: string;
}

export interface ListLeadNotesResponse {
  status: string;
  notes: Note[];
}

export interface CreateLeadNoteRequest {
  text: string;
}

export interface CreateLeadNoteResponse {
  status: string;
  note: Note;
}

export type UpdateLeadNoteRequest = CreateLeadNoteRequest;
export type UpdateLeadNoteResponse = CreateLeadNoteResponse;

export interface TargetLocation {
  name: string;
  urn: string;
}

export interface TargetCompany {
  urn: string;
  name: string;
  universal_name: string;
  logo_url: string;
}

export interface EmploymentType {
  urn: string;
  name: string;
}

export interface Date {
  month?: number;
  year: number;
}

export interface Experience {
  company: TargetCompany;
  job_title: string;
  employment_type: EmploymentType;
  start_date: Date;
  end_date?: Date;
  location?: TargetLocation;
}

export interface School {
  name: string;
  urn?: string;
  logo_url?: string;
}

export interface Entity {
  urn?: string;
  name: string;
}

export interface FieldOfStudy {
  entity: Entity;
}

export interface Degree {
  entity: Entity;
}

export interface Education {
  school: School;
  field_of_study: FieldOfStudy;
  degree: Degree;
  start_date?: Date;
  end_date?: Date;
  description?: string;
}

export interface Interest {
  name: string;
  type: string;
  url: string;
  logo_url: string;
}

export interface Language {
  name: string;
  proficiency: string;
  id: number;
}

export interface Skill {
  name: string;
  category: string;
}

export interface Origin {
  id: string;
  name: string;
}

export interface LeadDetails {
  id: string;
  urn: string;
  public_identifier: string;
  first_name: string;
  last_name: string;
  full_name: string;
  industry_urn: string;
  occupation: string;
  picture_url: string;
  location: TargetLocation;
  work_experience: Experience[];
  education: Education[];
  interests: Interest[];
  first_scraped_at: string;
  last_scraped_at: string;
  premium: boolean;
  email: string;
  current_experience: Experience[];
  certifications: unknown[];
  languages: unknown[];
  skills: unknown[];
  volunteer_experience: unknown[];
  twitter_handles: unknown[];
  phones: unknown[];
  is_lead: boolean;
  origins: Origin[];
  notes: unknown[];
  labels: unknown[];
  lead_of: string[];
}

export type TargetProfile = LeadDetails;

export interface GetLeadDetailsResponse {
  status: string;
  lead: LeadDetails;
}

export interface SearchLeadsRequest {
  keywords?: string;
  current_companies?: string[];
  past_companies?: string[];
  education?: string[];
  interests?: string[];
  labels?: string[];
  languages?: string[];
  locations?: string[];
  origins?: string[];
  skills?: string[];
  lead_of?: string[];
  optimize?: boolean;
}

export interface SearchLeadsParams {
  page?: number;
  count?: number;
}

export interface Facet {
  id: string;
  target_count: number;
  name: string;
}

export interface LeadFacets {
  origins: Facet[];
  current_companies: Facet[];
  past_companies: Facet[];
  schools: Facet[];
  locations: Facet[];
  labels: Facet[];
  interests: Facet[];
  languages: Facet[];
  skills: Facet[];
  lead_of: Facet[];
}

export interface Birthday {
  month: string;
  day: string;
}

export interface Phone {
  number: string;
  type: string;
}

export interface ContactInfo {
  birthday: Birthday;
}

export interface LeadHit {
  birthday: Birthday;
  occupation: string;
  picture_url: string;
  phones: Phone[];
  contact_info: ContactInfo;
  labels: any[];
  urn: string;
  full_name: string;
  lead_of: string[];
  location: TargetLocation;
  id: string;
  email: string;
  notes: any[];
  current_experience: Experience[];
  work_experience: Experience[];
  origins: Origin[];
  certifications: any[];
  languages: any[];
  skills: any[];
  interests: any[];
  education: any[];
  volunteer_experience: any[];
  twitter_handles: any[];
}

export interface SearchLeadsResponse {
  status: string;
  leads: {
    facets: LeadFacets;
    hits: LeadHit[];
    status: string;
    total_leads: number;
    sync: boolean;
    accounts_sync: Record<string, boolean>;
  };
}

// =============================================================================
// Messages (Conversations)
// =============================================================================
export interface LastMessage {
  urn: string;
  conversation_urn: string;
  type: string;
  created_at: number;
  subject: string | null;
  body: string;
  deleted: unknown;
  edited: unknown;
  declined: unknown;
  sender: {
    id: string;
    full_name: string;
  };
  gif: unknown;
  links: unknown[];
  updated_at: string;
}

export type ConversationParticipant = LeadDetails;

export interface Conversation {
  unread_count: number;
  connected: boolean;
  last_activity_at: string;
  conversation_urn: string;
  last_message: LastMessage;
  participants: ConversationParticipant[];
  owner: string;
}

export interface ListConversationsResponse {
  status: string;
  conversations: Conversation[];
}

export interface Message {
  urn: string;
  type: string;
  subject: string | null;
  body: string;
  sender: {
    id: string;
    full_name: string;
  };
  created_at: number;
}

export interface GetConversationResponse {
  status: string;
  messages: Message[];
}

export interface GetLeadConversationResponse {
  status: string;
  conversation_urn: string;
}

export interface StartConversationWithRecipientsRequest {
  message: string;
  recipients: string[];
}
export interface StartConversationWithUrnsRequest {
  message: string;
  recipient_urns: string[];
}

export type StartConversationRequest =
  | StartConversationWithRecipientsRequest
  | StartConversationWithUrnsRequest;

export interface StartConversationResponse {
  conversation_urn: string;
  created_at: number;
  message_urn: string;
  status: string;
}

export interface SendMessageToConversationRequest {
  message: string;
}

export interface ReactToMessageRequest {
  emoji: string;
  unreact: boolean;
}

export interface EditMessageRequest {
  message: string;
}

// =============================================================================
// Templates
// =============================================================================
export interface TemplateStats {
  sent: number;
  replies: number;
  accepted: number;
}

export interface Template {
  id: string;
  name: string;
  type: 'NOTE_TEMPLATE' | 'INMAIL_TEMPLATE' | 'MESSAGE_TEMPLATE';
  message: string;
  ai: boolean;
  created_at: number;
  stats: TemplateStats;
}

export interface ListTemplatesResponse {
  status: string;
  templates: Template[];
}

export interface TemplateDetails {
  id: string;
  agency_id: string;
  message: string;
  subject: string | null;
  type: 'NOTE_TEMPLATE' | 'INMAIL_TEMPLATE' | 'MESSAGE_TEMPLATE';
  name: string;
  is_deleted: boolean;
  is_global: boolean;
  created_at: number | string;
  edited_at: string | null;
  original_id: string | null;
  edited: boolean;
  ai: boolean;
  ai_prompt_id: string | null;
  stats: TemplateStats;
}

export interface GetTemplateResponse {
  status: string;
  template: TemplateDetails;
}

export interface CreateTemplateRequest {
  name: string;
  type: 'NOTE_TEMPLATE' | 'INMAIL_TEMPLATE' | 'MESSAGE_TEMPLATE';
  message: string;
  subject?: string;
  ai?: boolean;
}

export interface CreateTemplateResponse {
  status: string;
  template: TemplateDetails;
}

export type EditTemplateRequest = Partial<CreateTemplateRequest>;
export interface EditTemplateResponse {
  status: string;
  template: Omit<TemplateDetails, 'stats'>;
}

// =============================================================================
// Webhooks
// =============================================================================
export type WebhookEvent =
  | 'account_logged_in'
  | 'account_logged_out'
  | 'new_connection'
  | 'view'
  | 'connect'
  | 'accepted'
  | 'inmail'
  | 'message_request'
  | 'message'
  | 'reply'
  | 'inmail_reply';

export interface Webhook {
  id: string;
  workspace_id: string;
  name: string;
  events: WebhookEvent[];
  url: string;
  account_id: string | null;
  headers: Record<string, string> | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  integration: boolean;
}

export interface ListWebhooksResponse {
  status: string;
  webhooks: Webhook[];
}

export interface CreateWebhookRequest {
  name: string;
  events: WebhookEvent[];
  url: string;
  integration: false;
  headers?: Record<string, string>;
}

export interface CreateWebhookResponse {
  status: string;
  webhook: Webhook;
}

export type EditWebhookRequest = Partial<CreateWebhookRequest>;
