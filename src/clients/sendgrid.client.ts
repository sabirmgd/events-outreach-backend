import axios, { AxiosInstance } from 'axios';
import {
  MailSendRequest,
  SimpleEmailRequest,
  BulkEmailRequest,
  SendGridErrorResponse,
  SendGridSuccessResponse,
  EmailObject,
  ContentObject,
  PersonalizationObject,
  DynamicTemplateData,
  Template,
  TemplateVersion,
  CreateTemplateRequest,
  CreateTemplateVersionRequest,
  ApiKey,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  SenderIdentity,
  CreateSenderRequest,
  EmailStats,
  StatsQuery,
  SuppressionGroup,
  CreateSuppressionGroupRequest,
  GlobalSuppression,
  Bounce,
  SpamReport,
  Block,
  InvalidEmail,
} from './sendgrid.types';

export class SendGridClient {
  private readonly client: AxiosInstance;
  private readonly defaultSenderEmail: string;

  constructor(apiKey: string, defaultSenderEmail?: string) {
    this.client = axios.create({
      baseURL: 'https://api.sendgrid.com',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    this.defaultSenderEmail =
      defaultSenderEmail || process.env.SENDER_EMAIL || '';
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error) && error.response) {
      const sendGridError = error.response.data as SendGridErrorResponse;
      const errorMessage =
        sendGridError.errors
          ?.map(
            (err) =>
              `${err.message}${err.field ? ` (field: ${err.field})` : ''}`,
          )
          .join(', ') || 'Unknown SendGrid error';
      throw new Error(
        `SendGrid API error (${error.response.status}): ${errorMessage}`,
      );
    }
    throw new Error(`SendGrid API request failed: ${error}`);
  }

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
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
      this.handleError(error);
    }
  }

  private normalizeEmail(email: string | EmailObject): EmailObject {
    if (typeof email === 'string') {
      return { email };
    }
    return email;
  }

  private normalizeEmails(
    emails: string | string[] | EmailObject | EmailObject[],
  ): EmailObject[] {
    if (!Array.isArray(emails)) {
      return [this.normalizeEmail(emails)];
    }
    return emails.map((email) => this.normalizeEmail(email));
  }

  private getFromEmail(from?: string | EmailObject): EmailObject {
    if (from) {
      return this.normalizeEmail(from);
    }
    if (!this.defaultSenderEmail) {
      throw new Error(
        'No sender email provided and no default sender email configured',
      );
    }
    return { email: this.defaultSenderEmail };
  }

  // =============================================================================
  // Mail Send API
  // =============================================================================

  /**
   * Send email using the v3 Mail Send API with full control
   */
  async sendMail(mailData: MailSendRequest): Promise<SendGridSuccessResponse> {
    // Ensure from email is set
    if (!mailData.from && this.defaultSenderEmail) {
      mailData.from = { email: this.defaultSenderEmail };
    }

    try {
      const response = await this.client.post('/v3/mail/send', mailData);
      const messageId = response.headers['x-message-id'];
      return { message_id: messageId };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Send a simple email (convenience method)
   */
  async sendSimpleEmail(
    emailData: SimpleEmailRequest,
  ): Promise<SendGridSuccessResponse> {
    const fromEmail = this.getFromEmail(emailData.from);
    const toEmails = this.normalizeEmails(emailData.to);

    const personalization: PersonalizationObject = {
      to: toEmails,
    };

    if (emailData.subject) {
      personalization.subject = emailData.subject;
    }

    // Add CC if provided
    if (emailData.cc) {
      personalization.cc = this.normalizeEmails(emailData.cc);
    }

    // Add BCC if provided
    if (emailData.bcc) {
      personalization.bcc = this.normalizeEmails(emailData.bcc);
    }

    // Add dynamic template data or substitutions
    if (emailData.dynamic_template_data) {
      personalization.dynamic_template_data = emailData.dynamic_template_data;
    }
    if (emailData.substitutions) {
      personalization.substitutions = emailData.substitutions;
    }
    if (emailData.custom_args) {
      personalization.custom_args = emailData.custom_args;
    }
    if (emailData.send_at) {
      personalization.send_at = emailData.send_at;
    }
    if (emailData.headers) {
      personalization.headers = emailData.headers;
    }

    const mailData: MailSendRequest = {
      personalizations: [personalization],
      from: fromEmail,
    };

    // Add content if not using template
    if (!emailData.template_id) {
      if (!emailData.subject) {
        throw new Error('Subject must be provided for non-template emails');
      }
      const content: ContentObject[] = [];
      if (emailData.text) {
        content.push({ type: 'text/plain', value: emailData.text });
      }
      if (emailData.html) {
        content.push({ type: 'text/html', value: emailData.html });
      }
      if (content.length === 0) {
        throw new Error(
          'Either content (text/html) or template_id must be provided',
        );
      }
      mailData.content = content;
    } else {
      mailData.template_id = emailData.template_id;
    }

    // Add optional fields
    if (emailData.reply_to) {
      mailData.reply_to = this.normalizeEmail(emailData.reply_to);
    }
    if (emailData.attachments) {
      mailData.attachments = emailData.attachments;
    }
    if (emailData.categories) {
      mailData.categories = emailData.categories;
    }
    if (emailData.asm) {
      mailData.asm = emailData.asm;
    }
    if (emailData.mail_settings) {
      mailData.mail_settings = emailData.mail_settings;
    }
    if (emailData.tracking_settings) {
      mailData.tracking_settings = emailData.tracking_settings;
    }

    return this.sendMail(mailData);
  }

  /**
   * Send bulk emails with different personalizations
   */
  async sendBulkEmail(
    bulkData: BulkEmailRequest,
  ): Promise<SendGridSuccessResponse> {
    const fromEmail = this.getFromEmail(bulkData.from);

    const mailData: MailSendRequest = {
      personalizations: bulkData.personalizations,
      from: fromEmail,
    };

    // Add global subject if provided
    if (bulkData.subject) {
      mailData.subject = bulkData.subject;
    }

    // Add content if not using template
    if (!bulkData.template_id) {
      const content: ContentObject[] = [];
      if (bulkData.text) {
        content.push({ type: 'text/plain', value: bulkData.text });
      }
      if (bulkData.html) {
        content.push({ type: 'text/html', value: bulkData.html });
      }
      if (content.length > 0) {
        mailData.content = content;
      }
    } else {
      mailData.template_id = bulkData.template_id;
    }

    // Add optional fields
    if (bulkData.reply_to) {
      mailData.reply_to = this.normalizeEmail(bulkData.reply_to);
    }
    if (bulkData.attachments) {
      mailData.attachments = bulkData.attachments;
    }
    if (bulkData.categories) {
      mailData.categories = bulkData.categories;
    }
    if (bulkData.custom_args) {
      mailData.custom_args = bulkData.custom_args;
    }
    if (bulkData.headers) {
      mailData.headers = bulkData.headers;
    }
    if (bulkData.send_at) {
      mailData.send_at = bulkData.send_at;
    }
    if (bulkData.asm) {
      mailData.asm = bulkData.asm;
    }
    if (bulkData.mail_settings) {
      mailData.mail_settings = bulkData.mail_settings;
    }
    if (bulkData.tracking_settings) {
      mailData.tracking_settings = bulkData.tracking_settings;
    }

    return this.sendMail(mailData);
  }

  /**
   * Send email with template
   */
  async sendTemplateEmail(
    templateId: string,
    to: string | string[] | EmailObject | EmailObject[],
    dynamicTemplateData?: DynamicTemplateData,
    from?: string | EmailObject,
  ): Promise<SendGridSuccessResponse> {
    return this.sendSimpleEmail({
      to,
      from,
      template_id: templateId,
      dynamic_template_data: dynamicTemplateData,
    });
  }

  // =============================================================================
  // Templates API
  // =============================================================================

  /**
   * Get all templates
   */
  async getTemplates(
    generations?: 'legacy' | 'dynamic',
  ): Promise<{ templates: Template[] }> {
    const params: { generations?: 'legacy' | 'dynamic' } | undefined =
      generations ? { generations } : undefined;
    return this.request<{ templates: Template[] }>(
      'get',
      '/v3/templates',
      undefined,
      params,
    );
  }

  /**
   * Get a specific template
   */
  async getTemplate(templateId: string): Promise<Template> {
    return this.request<Template>('get', `/v3/templates/${templateId}`);
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData: CreateTemplateRequest): Promise<Template> {
    return this.request<Template>('post', '/v3/templates', templateData);
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    templateData: Partial<CreateTemplateRequest>,
  ): Promise<Template> {
    return this.request<Template>(
      'patch',
      `/v3/templates/${templateId}`,
      templateData,
    );
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.request<void>('delete', `/v3/templates/${templateId}`);
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(
    templateId: string,
    name?: string,
  ): Promise<Template> {
    const data = name ? { name } : undefined;
    return this.request<Template>('post', `/v3/templates/${templateId}`, data);
  }

  // =============================================================================
  // Template Versions API
  // =============================================================================

  /**
   * Create a template version
   */
  async createTemplateVersion(
    versionData: CreateTemplateVersionRequest,
  ): Promise<TemplateVersion> {
    return this.request<TemplateVersion>(
      'post',
      `/v3/templates/${versionData.template_id}/versions`,
      versionData,
    );
  }

  /**
   * Get a template version
   */
  async getTemplateVersion(
    templateId: string,
    versionId: string,
  ): Promise<TemplateVersion> {
    return this.request<TemplateVersion>(
      'get',
      `/v3/templates/${templateId}/versions/${versionId}`,
    );
  }

  /**
   * Update a template version
   */
  async updateTemplateVersion(
    templateId: string,
    versionId: string,
    versionData: Partial<CreateTemplateVersionRequest>,
  ): Promise<TemplateVersion> {
    return this.request<TemplateVersion>(
      'patch',
      `/v3/templates/${templateId}/versions/${versionId}`,
      versionData,
    );
  }

  /**
   * Delete a template version
   */
  async deleteTemplateVersion(
    templateId: string,
    versionId: string,
  ): Promise<void> {
    await this.request<void>(
      'delete',
      `/v3/templates/${templateId}/versions/${versionId}`,
    );
  }

  /**
   * Activate a template version
   */
  async activateTemplateVersion(
    templateId: string,
    versionId: string,
  ): Promise<TemplateVersion> {
    return this.request<TemplateVersion>(
      'post',
      `/v3/templates/${templateId}/versions/${versionId}/activate`,
    );
  }

  // =============================================================================
  // API Keys API
  // =============================================================================

  /**
   * Get all API keys
   */
  async getApiKeys(): Promise<{ result: ApiKey[] }> {
    return this.request<{ result: ApiKey[] }>('get', '/v3/api_keys');
  }

  /**
   * Get a specific API key
   */
  async getApiKey(apiKeyId: string): Promise<{ result: ApiKey }> {
    return this.request<{ result: ApiKey }>('get', `/v3/api_keys/${apiKeyId}`);
  }

  /**
   * Create a new API key
   */
  async createApiKey(keyData: CreateApiKeyRequest): Promise<{
    api_key_id: string;
    api_key: string;
    name: string;
    scopes: string[];
  }> {
    return this.request<{
      api_key_id: string;
      api_key: string;
      name: string;
      scopes: string[];
    }>('post', '/v3/api_keys', keyData);
  }

  /**
   * Update an API key
   */
  async updateApiKey(
    apiKeyId: string,
    keyData: UpdateApiKeyRequest,
  ): Promise<{ result: ApiKey }> {
    return this.request<{ result: ApiKey }>(
      'patch',
      `/v3/api_keys/${apiKeyId}`,
      keyData,
    );
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(apiKeyId: string): Promise<void> {
    await this.request<void>('delete', `/v3/api_keys/${apiKeyId}`);
  }

  // =============================================================================
  // Sender Verification API
  // =============================================================================

  /**
   * Get all verified senders
   */
  async getVerifiedSenders(): Promise<{ results: SenderIdentity[] }> {
    return this.request<{ results: SenderIdentity[] }>(
      'get',
      '/v3/verified_senders',
    );
  }

  /**
   * Get a specific verified sender
   */
  async getVerifiedSender(senderId: number): Promise<SenderIdentity> {
    return this.request<SenderIdentity>(
      'get',
      `/v3/verified_senders/${senderId}`,
    );
  }

  /**
   * Create a verified sender
   */
  async createVerifiedSender(
    senderData: CreateSenderRequest,
  ): Promise<SenderIdentity> {
    return this.request<SenderIdentity>(
      'post',
      '/v3/verified_senders',
      senderData,
    );
  }

  /**
   * Update a verified sender
   */
  async updateVerifiedSender(
    senderId: number,
    senderData: Partial<CreateSenderRequest>,
  ): Promise<SenderIdentity> {
    return this.request<SenderIdentity>(
      'patch',
      `/v3/verified_senders/${senderId}`,
      senderData,
    );
  }

  /**
   * Delete a verified sender
   */
  async deleteVerifiedSender(senderId: number): Promise<void> {
    await this.request<void>('delete', `/v3/verified_senders/${senderId}`);
  }

  /**
   * Resend verification email for a sender
   */
  async resendVerification(senderId: number): Promise<void> {
    await this.request<void>('post', `/v3/verified_senders/${senderId}/resend`);
  }

  // =============================================================================
  // Statistics API
  // =============================================================================

  /**
   * Get global email statistics
   */
  async getGlobalStats(query: StatsQuery): Promise<EmailStats[]> {
    return this.request<EmailStats[]>('get', '/v3/stats', undefined, query);
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(
    categories: string[],
    query: StatsQuery,
  ): Promise<EmailStats[]> {
    const params = { ...query, categories: categories.join(',') };
    return this.request<EmailStats[]>(
      'get',
      '/v3/categories/stats',
      undefined,
      params,
    );
  }

  /**
   * Get subuser statistics
   */
  async getSubuserStats(
    subusers: string[],
    query: StatsQuery,
  ): Promise<EmailStats[]> {
    const params = { ...query, subusers: subusers.join(',') };
    return this.request<EmailStats[]>(
      'get',
      '/v3/subusers/stats',
      undefined,
      params,
    );
  }

  // =============================================================================
  // Suppression Management API
  // =============================================================================

  /**
   * Get all suppression groups
   */
  async getSuppressionGroups(): Promise<SuppressionGroup[]> {
    return this.request<SuppressionGroup[]>('get', '/v3/asm/groups');
  }

  /**
   * Get a specific suppression group
   */
  async getSuppressionGroup(groupId: number): Promise<SuppressionGroup> {
    return this.request<SuppressionGroup>('get', `/v3/asm/groups/${groupId}`);
  }

  /**
   * Create a suppression group
   */
  async createSuppressionGroup(
    groupData: CreateSuppressionGroupRequest,
  ): Promise<SuppressionGroup> {
    return this.request<SuppressionGroup>('post', '/v3/asm/groups', groupData);
  }

  /**
   * Update a suppression group
   */
  async updateSuppressionGroup(
    groupId: number,
    groupData: Partial<CreateSuppressionGroupRequest>,
  ): Promise<SuppressionGroup> {
    return this.request<SuppressionGroup>(
      'patch',
      `/v3/asm/groups/${groupId}`,
      groupData,
    );
  }

  /**
   * Delete a suppression group
   */
  async deleteSuppressionGroup(groupId: number): Promise<void> {
    await this.request<void>('delete', `/v3/asm/groups/${groupId}`);
  }

  /**
   * Add emails to a suppression group
   */
  async addToSuppressionGroup(
    groupId: number,
    emails: string[],
  ): Promise<{ recipient_emails: string[] }> {
    return this.request<{ recipient_emails: string[] }>(
      'post',
      `/v3/asm/groups/${groupId}/suppressions`,
      { recipient_emails: emails },
    );
  }

  /**
   * Remove email from a suppression group
   */
  async removeFromSuppressionGroup(
    groupId: number,
    email: string,
  ): Promise<void> {
    await this.request<void>(
      'delete',
      `/v3/asm/groups/${groupId}/suppressions/${email}`,
    );
  }

  /**
   * Get global suppressions
   */
  async getGlobalSuppressions(
    startTime?: number,
    endTime?: number,
    limit?: number,
    offset?: number,
  ): Promise<GlobalSuppression[]> {
    const params: Record<string, number> = {};
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    return this.request<GlobalSuppression[]>(
      'get',
      '/v3/suppression/unsubscribes',
      undefined,
      params,
    );
  }

  /**
   * Add email to global suppressions
   */
  async addToGlobalSuppressions(
    emails: string[],
  ): Promise<{ recipient_emails: string[] }> {
    return this.request<{ recipient_emails: string[] }>(
      'post',
      '/v3/suppression/unsubscribes',
      { recipient_emails: emails },
    );
  }

  /**
   * Remove email from global suppressions
   */
  async removeFromGlobalSuppressions(email: string): Promise<void> {
    await this.request<void>('delete', `/v3/suppression/unsubscribes/${email}`);
  }

  /**
   * Get bounces
   */
  async getBounces(
    startTime?: number,
    endTime?: number,
    limit?: number,
    offset?: number,
  ): Promise<Bounce[]> {
    const params: Record<string, number> = {};
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    return this.request<Bounce[]>(
      'get',
      '/v3/suppression/bounces',
      undefined,
      params,
    );
  }

  /**
   * Get a specific bounce
   */
  async getBounce(email: string): Promise<Bounce[]> {
    return this.request<Bounce[]>('get', `/v3/suppression/bounces/${email}`);
  }

  /**
   * Delete bounce
   */
  async deleteBounce(email: string): Promise<void> {
    await this.request<void>('delete', `/v3/suppression/bounces/${email}`);
  }

  /**
   * Delete all bounces
   */
  async deleteAllBounces(): Promise<void> {
    await this.request<void>('delete', '/v3/suppression/bounces');
  }

  /**
   * Get spam reports
   */
  async getSpamReports(
    startTime?: number,
    endTime?: number,
    limit?: number,
    offset?: number,
  ): Promise<SpamReport[]> {
    const params: Record<string, number> = {};
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    return this.request<SpamReport[]>(
      'get',
      '/v3/suppression/spam_reports',
      undefined,
      params,
    );
  }

  /**
   * Delete spam report
   */
  async deleteSpamReport(email: string): Promise<void> {
    await this.request<void>('delete', `/v3/suppression/spam_reports/${email}`);
  }

  /**
   * Get blocks
   */
  async getBlocks(
    startTime?: number,
    endTime?: number,
    limit?: number,
    offset?: number,
  ): Promise<Block[]> {
    const params: Record<string, number> = {};
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    return this.request<Block[]>(
      'get',
      '/v3/suppression/blocks',
      undefined,
      params,
    );
  }

  /**
   * Delete block
   */
  async deleteBlock(email: string): Promise<void> {
    await this.request<void>('delete', `/v3/suppression/blocks/${email}`);
  }

  /**
   * Get invalid emails
   */
  async getInvalidEmails(
    startTime?: number,
    endTime?: number,
    limit?: number,
    offset?: number,
  ): Promise<InvalidEmail[]> {
    const params: Record<string, number> = {};
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    return this.request<InvalidEmail[]>(
      'get',
      '/v3/suppression/invalid_emails',
      undefined,
      params,
    );
  }

  /**
   * Delete invalid email
   */
  async deleteInvalidEmail(email: string): Promise<void> {
    await this.request<void>(
      'delete',
      `/v3/suppression/invalid_emails/${email}`,
    );
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a base64 attachment from file buffer
   */
  static createAttachment(
    filename: string,
    content: Buffer | string,
    type?: string,
    disposition?: 'inline' | 'attachment',
    contentId?: string,
  ) {
    const base64Content = Buffer.isBuffer(content)
      ? content.toString('base64')
      : Buffer.from(content).toString('base64');

    return {
      filename,
      content: base64Content,
      type,
      disposition: disposition || 'attachment',
      content_id: contentId,
    };
  }

  /**
   * Create tracking settings with common defaults
   */
  static createTrackingSettings(
    options: {
      clickTracking?: boolean;
      openTracking?: boolean;
      subscriptionTracking?: boolean;
      googleAnalytics?: {
        utm_source?: string;
        utm_medium?: string;
        utm_campaign?: string;
        utm_term?: string;
        utm_content?: string;
      };
    } = {},
  ) {
    return {
      click_tracking: {
        enable: options.clickTracking ?? true,
        enable_text: false,
      },
      open_tracking: {
        enable: options.openTracking ?? true,
      },
      subscription_tracking: {
        enable: options.subscriptionTracking ?? false,
      },
      ganalytics: options.googleAnalytics
        ? {
            enable: true,
            ...options.googleAnalytics,
          }
        : undefined,
    };
  }
}
