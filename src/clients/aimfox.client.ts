import axios, { AxiosInstance } from 'axios';
import {
  AddLabelToWorkspaceRequest,
  AddLabelToWorkspaceResponse,
  AddProfilesToCampaignRequest,
  AddProfilesToCampaignResponse,
  AddProfileToCampaignRequest,
  CreateLeadNoteRequest,
  CreateLeadNoteResponse,
  CreateTemplateRequest,
  CreateTemplateResponse,
  CreateWebhookRequest,
  CreateWebhookResponse,
  EditMessageRequest,
  EditTemplateRequest,
  EditTemplateResponse,
  EditWebhookRequest,
  EditWorkspaceLabelRequest,
  EditWorkspaceLabelResponse,
  GetAccountLimitsResponse,
  GetCampaignResponse,
  GetConversationResponse,
  GetLeadConversationResponse,
  GetLeadDetailsResponse,
  GetTemplateResponse,
  ListAccountsResponse,
  ListBlacklistedProfilesResponse,
  ListCampaignsResponse,
  ListConversationsResponse,
  ListInteractionsParams,
  ListInteractionsResponse,
  ListLeadNotesResponse,
  ListRecentLeadsResponse,
  ListTemplatesResponse,
  ListWebhooksResponse,
  ListWorkspaceLabelsResponse,
  ReactToMessageRequest,
  SearchLeadsParams,
  SearchLeadsRequest,
  SearchLeadsResponse,
  SendMessageToConversationRequest,
  SetAccountLimitsRequest,
  SetAccountLimitsResponse,
  StartConversationRequest,
  StartConversationResponse,
  StatusOkResponse,
  UpdateCampaignRequest,
  UpdateCampaignResponse,
  UpdateLeadNoteRequest,
  UpdateLeadNoteResponse,
} from './aimfox.types';

export class AimfoxClient {
  private readonly client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.aimfox.com/api/v2',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    params?: unknown,
  ): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url: path,
        data,
        params,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          `Aimfox API error: ${error.response.status} ${JSON.stringify(
            error.response.data,
          )}`,
        );
      }
      throw new Error(`Aimfox API request failed: ${error}`);
    }
  }

  // =============================================================================
  // Accounts
  // =============================================================================

  async listAccounts(): Promise<ListAccountsResponse> {
    return this.request<ListAccountsResponse>('get', '/accounts');
  }

  async getAccountLimits(accountId: string): Promise<GetAccountLimitsResponse> {
    return this.request<GetAccountLimitsResponse>(
      'get',
      `/accounts/${accountId}/limits`,
    );
  }

  async setAccountLimits(
    accountId: string,
    limits: SetAccountLimitsRequest,
  ): Promise<SetAccountLimitsResponse> {
    return this.request<SetAccountLimitsResponse>(
      'patch',
      `/accounts/${accountId}/limits`,
      limits,
    );
  }

  // =============================================================================
  // Analytics
  // =============================================================================

  async listRecentLeads(): Promise<ListRecentLeadsResponse> {
    return this.request<ListRecentLeadsResponse>(
      'get',
      '/analytics/recent-leads',
    );
  }

  async listInteractions(
    params: ListInteractionsParams,
  ): Promise<ListInteractionsResponse> {
    return this.request<ListInteractionsResponse>(
      'get',
      '/analytics/interactions',
      undefined,
      params,
    );
  }

  // =============================================================================
  // Blacklist
  // =============================================================================

  async listBlacklistedProfiles(): Promise<ListBlacklistedProfilesResponse> {
    return this.request<ListBlacklistedProfilesResponse>('get', '/blacklist');
  }

  async addProfileToBlacklist(targetUrn: string): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>('post', `/blacklist/${targetUrn}`);
  }

  async removeProfileFromBlacklist(
    targetUrn: string,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>('delete', `/blacklist/${targetUrn}`);
  }

  // =============================================================================
  // Campaigns
  // =============================================================================

  async listCampaigns(): Promise<ListCampaignsResponse> {
    return this.request<ListCampaignsResponse>('get', '/campaigns');
  }

  async getCampaign(campaignId: string): Promise<GetCampaignResponse> {
    return this.request<GetCampaignResponse>('get', `/campaigns/${campaignId}`);
  }

  async addProfileToCampaign(
    campaignId: string,
    data: AddProfileToCampaignRequest,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'post',
      `/campaigns/${campaignId}/audience`,
      data,
    );
  }

  async addProfilesToCampaign(
    campaignId: string,
    data: AddProfilesToCampaignRequest,
  ): Promise<AddProfilesToCampaignResponse> {
    return this.request<AddProfilesToCampaignResponse>(
      'post',
      `/campaigns/${campaignId}/audience/multiple`,
      data,
    );
  }

  async updateCampaign(
    campaignId: string,
    data: UpdateCampaignRequest,
  ): Promise<UpdateCampaignResponse> {
    return this.request<UpdateCampaignResponse>(
      'patch',
      `/campaigns/${campaignId}`,
      data,
    );
  }

  // =============================================================================
  // Labels
  // =============================================================================

  async listWorkspaceLabels(): Promise<ListWorkspaceLabelsResponse> {
    return this.request<ListWorkspaceLabelsResponse>('get', '/labels');
  }

  async addLabelToWorkspace(
    data: AddLabelToWorkspaceRequest,
  ): Promise<AddLabelToWorkspaceResponse> {
    return this.request<AddLabelToWorkspaceResponse>('post', '/labels', data);
  }

  async editWorkspaceLabel(
    labelId: string,
    data: EditWorkspaceLabelRequest,
  ): Promise<EditWorkspaceLabelResponse> {
    return this.request<EditWorkspaceLabelResponse>(
      'patch',
      `/labels/${labelId}`,
      data,
    );
  }

  async deleteWorkspaceLabel(labelId: string): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>('delete', `/labels/${labelId}`);
  }

  // =============================================================================
  // Leads & Notes
  // =============================================================================

  async listLeadNotes(leadId: string): Promise<ListLeadNotesResponse> {
    return this.request<ListLeadNotesResponse>('get', `/leads/${leadId}/notes`);
  }

  async createLeadNote(
    leadId: string,
    data: CreateLeadNoteRequest,
  ): Promise<CreateLeadNoteResponse> {
    return this.request<CreateLeadNoteResponse>(
      'post',
      `/leads/${leadId}/notes`,
      data,
    );
  }

  async updateLeadNote(
    leadId: string,
    noteId: string,
    data: UpdateLeadNoteRequest,
  ): Promise<UpdateLeadNoteResponse> {
    return this.request<UpdateLeadNoteResponse>(
      'patch',
      `/leads/${leadId}/notes/${noteId}`,
      data,
    );
  }

  async deleteLeadNote(
    leadId: string,
    noteId: string,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'delete',
      `/leads/${leadId}/notes/${noteId}`,
    );
  }

  async getLeadDetails(leadId: string): Promise<GetLeadDetailsResponse> {
    return this.request<GetLeadDetailsResponse>('get', `/leads/${leadId}`);
  }

  async addLabelToLead(
    leadId: string,
    labelId: string,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'post',
      `/leads/${leadId}/labels/${labelId}`,
    );
  }

  async searchLeads(
    data: SearchLeadsRequest,
    params: SearchLeadsParams,
  ): Promise<SearchLeadsResponse> {
    return this.request<SearchLeadsResponse>(
      'post',
      '/leads:search',
      data,
      params,
    );
  }

  async removeLabelFromLead(
    leadId: string,
    labelId: string,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'delete',
      `/leads/${leadId}/labels/${labelId}`,
    );
  }

  // =============================================================================
  // Conversations (Messages)
  // =============================================================================

  async listConversations(): Promise<ListConversationsResponse> {
    return this.request<ListConversationsResponse>('get', '/conversations');
  }

  async getConversation(
    accountId: string,
    conversationUrn: string,
  ): Promise<GetConversationResponse> {
    return this.request<GetConversationResponse>(
      'get',
      `/accounts/${accountId}/conversations/${conversationUrn}`,
    );
  }

  async getLeadConversation(
    accountId: string,
    leadId: string,
  ): Promise<GetLeadConversationResponse> {
    return this.request<GetLeadConversationResponse>(
      'get',
      `/accounts/${accountId}/leads/${leadId}/conversation`,
    );
  }

  async startConversation(
    accountId: string,
    data: StartConversationRequest,
  ): Promise<StartConversationResponse> {
    return this.request<StartConversationResponse>(
      'post',
      `/accounts/${accountId}/conversations`,
      data,
    );
  }

  async sendMessageToConversation(
    accountId: string,
    conversationUrn: string,
    data: SendMessageToConversationRequest,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'post',
      `/accounts/${accountId}/conversations/${conversationUrn}`,
      data,
    );
  }

  async markConversationAsRead(
    accountId: string,
    conversationUrn: string,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'post',
      `/accounts/${accountId}/conversations/${conversationUrn}/mark-as-read`,
    );
  }

  async reactToMessage(
    accountId: string,
    conversationUrn: string,
    messageId: string,
    data: ReactToMessageRequest,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'post',
      `/accounts/${accountId}/conversations/${conversationUrn}/messages/${messageId}/react`,
      data,
    );
  }

  async editMessage(
    accountId: string,
    conversationUrn: string,
    messageId: string,
    data: EditMessageRequest,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'patch',
      `/accounts/${accountId}/conversations/${conversationUrn}/messages/${messageId}`,
      data,
    );
  }

  async deleteMessage(
    accountId: string,
    conversationUrn: string,
    messageId: string,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'delete',
      `/accounts/${accountId}/conversations/${conversationUrn}/messages/${messageId}`,
    );
  }

  // =============================================================================
  // Templates
  // =============================================================================

  async listTemplates(): Promise<ListTemplatesResponse> {
    return this.request<ListTemplatesResponse>('get', '/templates');
  }

  async getTemplate(templateId: string): Promise<GetTemplateResponse> {
    return this.request<GetTemplateResponse>('get', `/templates/${templateId}`);
  }

  async createTemplate(
    data: CreateTemplateRequest,
  ): Promise<CreateTemplateResponse> {
    return this.request<CreateTemplateResponse>('post', '/templates', data);
  }

  async editTemplate(
    templateId: string,
    data: EditTemplateRequest,
  ): Promise<EditTemplateResponse> {
    return this.request<EditTemplateResponse>(
      'patch',
      `/templates/${templateId}`,
      data,
    );
  }

  async deleteTemplate(templateId: string): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>('delete', `/templates/${templateId}`);
  }

  // =============================================================================
  // Webhooks
  // =============================================================================

  async listWebhooks(): Promise<ListWebhooksResponse> {
    return this.request<ListWebhooksResponse>('get', '/webhooks');
  }

  async createWebhook(
    data: CreateWebhookRequest,
  ): Promise<CreateWebhookResponse> {
    return this.request<CreateWebhookResponse>('post', '/webhooks', data);
  }

  async editWebhook(
    webhookId: string,
    data: EditWebhookRequest,
  ): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>(
      'patch',
      `/webhooks/${webhookId}`,
      data,
    );
  }

  async deleteWebhook(webhookId: string): Promise<StatusOkResponse> {
    return this.request<StatusOkResponse>('delete', `/webhooks/${webhookId}`);
  }
}
