export enum Permission {
  // Prompt permissions
  PROMPTS_READ = 'prompts:read',
  PROMPTS_CREATE = 'prompts:create',
  PROMPTS_UPDATE = 'prompts:update',
  PROMPTS_DELETE = 'prompts:delete',
  PROMPTS_PUBLISH = 'prompts:publish',
  PROMPTS_EVALUATE = 'prompts:evaluate',

  // Agent permissions
  AGENTS_READ = 'agents:read',
  AGENTS_EXECUTE = 'agents:execute',
  AGENTS_CREATE = 'agents:create',
  AGENTS_UPDATE = 'agents:update',
  AGENTS_DELETE = 'agents:delete',

  // Event permissions
  EVENTS_READ = 'events:read',
  EVENTS_CREATE = 'events:create',
  EVENTS_UPDATE = 'events:update',
  EVENTS_DELETE = 'events:delete',
  EVENTS_DISCOVER = 'events:discover',

  // Company permissions
  COMPANIES_READ = 'companies:read',
  COMPANIES_CREATE = 'companies:create',
  COMPANIES_UPDATE = 'companies:update',
  COMPANIES_DELETE = 'companies:delete',
  COMPANIES_ENRICH = 'companies:enrich',

  // Person permissions
  PERSONAS_READ = 'personas:read',
  PERSONAS_CREATE = 'personas:create',
  PERSONAS_UPDATE = 'personas:update',
  PERSONAS_DELETE = 'personas:delete',
  PERSONAS_ENRICH = 'personas:enrich',

  // Outreach permissions
  OUTREACH_READ = 'outreach:read',
  OUTREACH_CREATE = 'outreach:create',
  OUTREACH_UPDATE = 'outreach:update',
  OUTREACH_DELETE = 'outreach:delete',
  OUTREACH_EXECUTE = 'outreach:execute',

  // Meeting permissions
  MEETINGS_READ = 'meetings:read',
  MEETINGS_CREATE = 'meetings:create',
  MEETINGS_UPDATE = 'meetings:update',
  MEETINGS_DELETE = 'meetings:delete',

  // User permissions
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // Job permissions
  JOBS_READ = 'jobs:read',
  JOBS_CREATE = 'jobs:create',
  JOBS_CANCEL = 'jobs:cancel',

  // System permissions
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_METRICS = 'system:metrics',
}
