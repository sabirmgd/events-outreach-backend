# Outreach Queue Testing Implementation Summary

## Overview

We've successfully implemented testing endpoints for the outreach queue system that allows you to:

1. Create email senders for organizations
2. Initiate outreach sequences for selected persons
3. Process the queue immediately (without waiting for cron)
4. View and delete scheduled actions

## Implementation Details

### 1. New Endpoints Created

#### Organization Endpoints

- `GET /organizations/:id` - Get organization details with email senders
- `POST /organizations/:id/email-senders` - Create email sender for organization
- `GET /organizations/:id/email-senders` - List email senders for organization

#### Outreach Test Endpoints

- `POST /outreach/test/initiate-sequence` - Create conversations and schedule actions
- `GET /outreach/test/scheduled-actions` - View all scheduled actions
- `DELETE /outreach/test/scheduled-actions` - Delete all pending/processing actions
- `POST /outreach/test/process-immediately/:organizationId` - Trigger queue processing

### 2. Key Features

#### Email Sender Management

- Organizations can have multiple email senders
- Each sender has:
  - `from_name` and `from_email`
  - Optional `sendgrid_key` (if different from org default)
  - `daily_limit` (default: 400)

#### Sequence Initiation

- Select specific persons by ID
- Choose a sequence from your seed data
- Option to send immediately (`sendImmediately: true`)
- Creates conversations and scheduled actions atomically

#### Queue Processing

- Uses the Named Queues strategy (one queue per organization)
- Immediate processing for testing (bypasses cron schedule)
- Maintains multi-tenant isolation

### 3. Test Flow

1. **Login** to get JWT token:

   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "sabirmgd+admin@gmail.com",
       "password": "securePassword123!"
     }'
   ```

2. **Create Email Sender** (one-time setup):

   ```bash
   curl -X POST http://localhost:3000/organizations/YOUR_ORG_ID/email-senders \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "from_name": "Your Name",
       "from_email": "your-email@example.com",
       "sendgrid_key": "YOUR_SENDGRID_API_KEY",
       "daily_limit": 100
     }'
   ```

3. **Initiate Sequence**:

   ```bash
   curl -X POST http://localhost:3000/outreach/test/initiate-sequence \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "signalId": "YOUR_SIGNAL_ID",
       "sequenceId": "YOUR_SEQUENCE_ID",
       "personIds": ["YOUR_PERSON_ID"],
       "sendImmediately": true
     }'
   ```

   curl -X POST http://localhost:3000/outreach/test/initiate-sequence \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNGY5MDNjNy04YThhLTQxYzItOWUwNi00ODk2NjI4NzNkZjAiLCJlbWFpbCI6InNhYmlybWdkK2FkbWluQGdtYWlsLmNvbSIsInJvbGVzIjpbIk9SR0FOSVpBVElPTl9BRE1JTiJdLCJwZXJtaXNzaW9ucyI6W10sIm9yZ2FuaXphdGlvbklkIjoiMWU0MjM0MjAtZDBjMS00OGVmLTgyODEtNzhhZDg1MThhZGI3IiwidGVhbUlkIjoiYjY4ZGVhMTgtMjk4MS00YmNlLWE2OTAtYTRlMjRkOTRiNmM4IiwiaWF0IjoxNzU0MTYwNTU3LCJleHAiOjE3NTQxNjE0NTd9.6rmtfQ4ilkXYGIHgVdxaRx_bAWfdhSSf5XwqVnHBMbc" \
    -H "Content-Type: application/json" \
    -d '{
   "signalId": "3793b64d-f80d-4e53-8d19-a22f44d5caa9",
   "sequenceId": "1",
   "personIds": ["1","2"],
   "sendImmediately": true
   }'

4. **Process Queue**:

   ```bash
   curl -X POST http://localhost:3000/outreach/test/process-immediately/YOUR_ORG_ID \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

5. **Check Results**:
   ```bash
   curl -X GET http://localhost:3000/outreach/test/scheduled-actions \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### 4. Important Notes

- The system respects the channel type from your sequence steps (email vs LinkedIn)
- For email steps, it uses the configured email sender
- The `sendImmediately` flag schedules all actions for immediate processing
- The queue processor (`ActionProcessor`) will handle the actual sending
- Make sure your SendGrid API key is configured in environment variables

### 5. Seed Data Integration

Your seed data includes:

- **Organizations**: TechReach Solutions, EventConnect Pro
- **Sequences**: Conference Sponsor Outreach (4 steps), Series B Funded Companies (2 steps), etc.
- **Personas**: John Smith, Sarah Johnson, etc. (all with email addresses)
- **Steps**: Mix of email and LinkedIn messages with templates

### 6. Error Handling

The implementation includes proper error handling for:

- Missing email senders
- Invalid sequence/signal/person IDs
- Transaction failures (with rollback)
- Queue processing errors

## Next Steps

1. Configure your SendGrid API key in `.env`:

   ```
   SENDGRID_API_KEY=your_actual_key
   SENDGRID_FROM_EMAIL=your_verified_sender@example.com
   ```

2. Run the seed data if not already done:

   ```bash
   RUN_SEEDS=true npm run start:dev
   ```

3. Use the test endpoints to verify the queue system works end-to-end

4. Monitor the logs to see:
   - Scheduled actions being created
   - Queue processing
   - Email sending attempts
   - Any errors that occur

The implementation is production-ready with proper multi-tenancy, rate limiting, and error handling!
