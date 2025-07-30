# Prompts and Agents System Documentation

## Overview

This document describes the Prompts and Agents system implemented in the events-outreach-backend. The system provides:

1. **Prompts Module**: A versioned prompt management system with variable interpolation and evaluation capabilities
2. **Agent Module**: A decorator-based agent framework with real-time execution tracking
3. **RBAC System**: Role-based access control with fine-grained permissions

## Prompts Module

### Features

- **Version Control**: Track prompt versions with draft/published/archived states
- **Variable Interpolation**: Support for {{variable}} syntax with type inference
- **Evaluation**: Test prompts with real agents and track metrics
- **Tags**: Organize prompts with tags
- **Test Cases**: Define test cases for prompt validation

### API Endpoints

#### Prompt Management
- `GET /prompts` - List all prompts (requires `prompts:read`)
- `POST /prompts` - Create new prompt (requires `prompts:create`)
- `GET /prompts/:id` - Get specific prompt (requires `prompts:read`)
- `GET /prompts/key/:key` - Get prompt by key (requires `prompts:read`)
- `PUT /prompts/:id` - Update prompt (requires `prompts:update`)
- `DELETE /prompts/:id` - Archive prompt (requires `prompts:delete`)
- `POST /prompts/:id/restore` - Restore archived prompt (requires `prompts:update`)

#### Version Management
- `POST /prompts/:id/versions` - Create new version (requires `prompts:update`)
- `GET /prompts/:id/versions` - List all versions (requires `prompts:read`)
- `GET /prompts/:id/versions/:versionId` - Get specific version (requires `prompts:read`)
- `PUT /prompts/:id/versions/:versionId/publish` - Publish version (requires `prompts:publish`)
- `GET /prompts/:id/versions/published` - Get published version (requires `prompts:read`)

#### Variable Management
- `POST /prompts/extract-variables` - Extract variables from template (requires `prompts:read`)
- `POST /prompts/:id/versions/:versionId/preview` - Preview prompt with variables (requires `prompts:read`)

#### Evaluation
- `POST /prompts/:id/evaluate` - Run evaluation (requires `prompts:evaluate`)
- `GET /prompts/:id/evaluations` - Get evaluation history (requires `prompts:read`)
- `GET /prompts/:id/evaluations/metrics` - Get evaluation metrics (requires `prompts:read`)
- `POST /prompts/compare` - Compare multiple prompts (requires `prompts:evaluate`)

### Example Usage

```typescript
// Create a prompt
const prompt = await fetch('/prompts', {
  method: 'POST',
  body: JSON.stringify({
    key: 'event-search',
    name: 'Event Search Prompt',
    namespace: 'discovery',
    type: 'system',
    body: 'Search for {{eventType}} events in {{city}} between {{startDate}} and {{endDate}}',
  }),
});

// Publish a version
await fetch(`/prompts/${promptId}/versions/${versionId}/publish`, {
  method: 'PUT',
  body: JSON.stringify({
    publishedBy: 'user@example.com',
  }),
});

// Run evaluation
const evaluation = await fetch(`/prompts/${promptId}/evaluate`, {
  method: 'POST',
  body: JSON.stringify({
    input: { query: 'tech conferences in SF' },
    variables: {
      eventType: 'technology',
      city: 'San Francisco',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  }),
});
```

## Agent Module

### Features

- **Decorator-based Registration**: Use `@Agent` and `@AgentMethod` decorators
- **Auto-discovery**: Agents are automatically discovered at startup
- **Real-time Progress**: WebSocket support for execution progress
- **Parameter Validation**: Automatic parameter validation
- **Execution Context**: Rich context with progress reporting capabilities

### API Endpoints

- `GET /agents` - List all available agents (requires `agents:read`)
- `GET /agents/:agentId` - Get agent details (requires `agents:read`)
- `GET /agents/:agentId/methods/:methodName` - Get method details (requires `agents:read`)
- `POST /agents/:agentId/:methodName/validate` - Validate parameters (requires `agents:read`)
- `POST /agents/:agentId/:methodName/execute` - Execute agent method (requires `agents:execute`)

### Creating an Agent

```typescript
import { Injectable } from '@nestjs/common';
import { Agent, AgentMethod } from '@/agent/decorators';

@Injectable()
@Agent({
  id: 'my-agent',
  name: 'My Custom Agent',
  description: 'Does amazing things',
  category: 'custom',
})
export class MyAgent {
  @AgentMethod({
    description: 'Process some data',
    parameters: [
      {
        name: 'input',
        type: 'string',
        description: 'Input data to process',
        required: true,
      },
    ],
  })
  async processData(params: { input: string }, context?: any) {
    // Report progress
    await context?.reportProgress(25, 'Starting processing', 1, 4);
    
    // Do work...
    
    await context?.reportProgress(100, 'Processing complete', 4, 4);
    
    return { result: 'processed' };
  }
}
```

### WebSocket Integration

Connect to the agent execution namespace for real-time updates:

```javascript
const socket = io('/agent-execution', {
  auth: { token: 'your-jwt-token' },
});

// Start execution
socket.emit('startAgentExecution', {
  agentId: 'event-discovery',
  methodName: 'searchEvents',
  params: {
    cities: ['San Francisco', 'New York'],
    industries: ['Technology'],
  },
});

// Listen for progress
socket.on('agentProgress', (progress) => {
  console.log(`Progress: ${progress.progress}% - ${progress.message}`);
});

// Listen for completion
socket.on('agentCompleted', (result) => {
  console.log('Execution completed:', result);
});
```

## RBAC System

### Roles

1. **ADMIN** - Full system access
2. **OPS** - Operational access (manage prompts, agents, events)
3. **SALES** - Business operations (read/execute, manage outreach)
4. **VIEWER** - Read-only access

### Permission Categories

- **Prompts**: read, create, update, delete, publish, evaluate
- **Agents**: read, execute, create, update, delete
- **Events**: read, create, update, delete, discover
- **Companies**: read, create, update, delete, enrich
- **Personas**: read, create, update, delete, enrich
- **Outreach**: read, create, update, delete, execute
- **System**: config, logs, metrics

### Using Guards

```typescript
@Controller('protected')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProtectedController {
  @Post('action')
  @RequirePermissions(Permission.AGENTS_EXECUTE)
  async performAction() {
    // Only users with AGENTS_EXECUTE permission can access
  }

  @Get('data')
  @RequireAnyPermission(Permission.EVENTS_READ, Permission.COMPANIES_READ)
  async getData() {
    // Users need either EVENTS_READ OR COMPANIES_READ
  }

  @Put('admin')
  @Roles(Role.ADMIN)
  async adminAction() {
    // Only ADMIN role can access
  }
}
```

## Example Agents

### Event Discovery Agent

Searches for events and enriches event data:

```typescript
// Search for events
POST /agents/event-discovery/searchEvents/execute
{
  "params": {
    "cities": ["San Francisco", "New York"],
    "industries": ["Technology", "Finance"],
    "yearRange": { "start": 2024, "end": 2025 },
    "maxResults": 50
  }
}

// Enrich event
POST /agents/event-discovery/enrichEvent/execute
{
  "params": {
    "eventId": 123,
    "fields": ["sponsors", "speakers", "agenda"]
  }
}
```

### Company Enrichment Agent

Enriches company data and finds similar companies:

```typescript
// Enrich company
POST /agents/company-enrichment/enrichCompany/execute
{
  "params": {
    "companyId": 456,
    "enrichmentType": "detailed"
  }
}

// Find similar companies
POST /agents/company-enrichment/findSimilarCompanies/execute
{
  "params": {
    "companyId": 456,
    "limit": 20,
    "minSimilarity": 0.8
  }
}
```

## Integration Example

Here's how prompts and agents work together:

```typescript
// 1. Agent uses prompt service to get the prompt
const prompt = await this.promptsService.findByKey('event-search');
const publishedVersion = await this.promptsService.getPublishedVersion(prompt.id);

// 2. Prepare variables
const variables = {
  cities: params.cities.join(', '),
  industries: params.industries.join(', '),
  yearRange: `${params.yearStart}-${params.yearEnd}`,
};

// 3. Preview the prompt with variables
const { preview } = await this.promptsService.previewPrompt(
  prompt.id,
  publishedVersion.id,
  { variables },
);

// 4. Use the interpolated prompt with AI service
const results = await this.aiService.search({
  query: preview.preview,
});
```

## Best Practices

1. **Prompt Management**
   - Always publish prompts before using in production
   - Use semantic versioning in changelogs
   - Test prompts with evaluation before publishing
   - Use namespaces to organize prompts by domain

2. **Agent Development**
   - Report progress frequently for long-running operations
   - Validate parameters early in the method
   - Use meaningful categories for agent organization
   - Handle errors gracefully with proper error messages

3. **Security**
   - Always use appropriate permission decorators
   - Validate user permissions before sensitive operations
   - Log all agent executions for audit trails
   - Sanitize prompt variables to prevent injection

4. **Performance**
   - Use WebSocket for real-time updates instead of polling
   - Implement proper caching for frequently used prompts
   - Batch operations when possible
   - Monitor agent execution times and optimize