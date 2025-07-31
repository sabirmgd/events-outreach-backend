# SendGrid Client

A comprehensive TypeScript client for the SendGrid v3 API, similar in structure to the Aimfox client.

## Features

- **Mail Send API**: Send transactional emails, templates, and bulk emails
- **Template Management**: Create, update, and manage dynamic templates
- **Sender Verification**: Manage verified senders
- **Statistics**: Get email statistics and analytics
- **Suppression Management**: Handle bounces, spam reports, and unsubscribes
- **API Key Management**: Manage SendGrid API keys
- **TypeScript Support**: Full type definitions for all API endpoints
- **Error Handling**: Comprehensive error handling with detailed messages
- **Utilities**: Helper methods for common tasks

## Setup

1. Set your SendGrid API key in environment variables:

```bash
export SENDGRID_API_KEY='your-sendgrid-api-key'
export SENDER_EMAIL='your-default-sender@example.com'  # Optional default sender
```

2. Import and use the client:

```typescript
import { SendGridClient } from './sendgrid.client';

const sendGrid = new SendGridClient(
  process.env.SENDGRID_API_KEY!,
  process.env.SENDER_EMAIL, // Optional default sender email
);
```

## Basic Usage Examples

### Send a Simple Email

```typescript
await sendGrid.sendSimpleEmail({
  to: 'recipient@example.com',
  subject: 'Hello from SendGrid!',
  text: 'This is a plain text email.',
  html: '<p>This is an <strong>HTML</strong> email.</p>',
});
```

### Send Email with Template

```typescript
await sendGrid.sendTemplateEmail(
  'd-1234567890abcdef', // Dynamic template ID
  'recipient@example.com',
  {
    name: 'John Doe',
    confirmation_number: '12345',
  },
);
```

### Send Bulk Email

```typescript
await sendGrid.sendBulkEmail({
  personalizations: [
    {
      to: [{ email: 'user1@example.com', name: 'User 1' }],
      dynamic_template_data: { name: 'User 1', code: 'ABC123' },
    },
    {
      to: [{ email: 'user2@example.com', name: 'User 2' }],
      dynamic_template_data: { name: 'User 2', code: 'DEF456' },
    },
  ],
  template_id: 'd-1234567890abcdef',
});
```

### Send Email with Attachment

```typescript
import * as fs from 'fs';

const fileBuffer = fs.readFileSync('document.pdf');
const attachment = SendGridClient.createAttachment(
  'document.pdf',
  fileBuffer,
  'application/pdf',
);

await sendGrid.sendSimpleEmail({
  to: 'recipient@example.com',
  subject: 'Document Attached',
  html: '<p>Please find the document attached.</p>',
  attachments: [attachment],
});
```

## Advanced Usage

### Template Management

```typescript
// Create a new template
const template = await sendGrid.createTemplate({
  name: 'Welcome Email',
  generation: 'dynamic',
});

// Create a template version
const version = await sendGrid.createTemplateVersion({
  template_id: template.id,
  name: 'Version 1',
  subject: 'Welcome {{name}}!',
  html_content: '<h1>Welcome {{name}}!</h1><p>Thanks for joining us.</p>',
});

// Activate the version
await sendGrid.activateTemplateVersion(template.id, version.id);
```

### Statistics

```typescript
// Get global statistics for the last 7 days
const stats = await sendGrid.getGlobalStats({
  start_date: '2024-01-01',
  end_date: '2024-01-07',
  aggregated_by: 'day',
});

// Get category statistics
const categoryStats = await sendGrid.getCategoryStats(
  ['newsletter', 'promotion'],
  { start_date: '2024-01-01', end_date: '2024-01-07' },
);
```

### Suppression Management

```typescript
// Get all bounces
const bounces = await sendGrid.getBounces();

// Remove a specific bounce
await sendGrid.deleteBounce('bounced@example.com');

// Add emails to global suppressions
await sendGrid.addToGlobalSuppressions([
  'user1@example.com',
  'user2@example.com',
]);

// Create a suppression group
const group = await sendGrid.createSuppressionGroup({
  name: 'Marketing Emails',
  description: 'Marketing and promotional emails',
});
```

### Sender Verification

```typescript
// Create a verified sender
const sender = await sendGrid.createVerifiedSender({
  nickname: 'Marketing Team',
  from_email: 'marketing@company.com',
  from_name: 'Marketing Team',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip: '94105',
  country: 'United States',
});

// Get all verified senders
const senders = await sendGrid.getVerifiedSenders();
```

## Utility Methods

### Email Validation

```typescript
const isValid = SendGridClient.isValidEmail('user@example.com'); // true
```

### Create Tracking Settings

```typescript
const tracking = SendGridClient.createTrackingSettings({
  clickTracking: true,
  openTracking: true,
  googleAnalytics: {
    utm_source: 'sendgrid',
    utm_medium: 'email',
    utm_campaign: 'welcome_series',
  },
});

await sendGrid.sendSimpleEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<p>Welcome to our service!</p>',
  tracking_settings: tracking,
});
```

## Error Handling

The client provides detailed error messages for debugging:

```typescript
try {
  await sendGrid.sendSimpleEmail({
    to: 'invalid-email',
    subject: 'Test',
    html: '<p>Test</p>',
  });
} catch (error) {
  console.error(error.message);
  // Output: "SendGrid API error (400): The email address is not valid (field: personalizations[0].to[0].email)"
}
```

## Environment Variables

- `SENDGRID_API_KEY`: Your SendGrid API key (required)
- `SENDER_EMAIL`: Default sender email address (optional)

## API Coverage

This client covers the most commonly used SendGrid v3 API endpoints:

- ✅ Mail Send API (v3/mail/send)
- ✅ Templates API (v3/templates)
- ✅ Template Versions API (v3/templates/{id}/versions)
- ✅ API Keys API (v3/api_keys)
- ✅ Sender Verification API (v3/verified_senders)
- ✅ Statistics API (v3/stats)
- ✅ Suppression Management APIs
- ✅ Bounces, Spam Reports, Blocks, Invalid Emails
- ✅ Suppression Groups (ASM)

For additional endpoints not covered by this client, you can use the underlying `request` method:

```typescript
const customData = await sendGrid['request']<any>(
  'get',
  '/v3/some/custom/endpoint',
);
```
