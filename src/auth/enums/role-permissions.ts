import { Role } from './role.enum';
import { Permission } from './permission.enum';

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Admin has all permissions
    ...Object.values(Permission),
  ],

  [Role.OPS]: [
    // Ops can manage prompts and agents
    Permission.PROMPTS_READ,
    Permission.PROMPTS_CREATE,
    Permission.PROMPTS_UPDATE,
    Permission.PROMPTS_DELETE,
    Permission.PROMPTS_PUBLISH,
    Permission.PROMPTS_EVALUATE,
    Permission.AGENTS_READ,
    Permission.AGENTS_EXECUTE,
    Permission.AGENTS_CREATE,
    Permission.AGENTS_UPDATE,
    Permission.AGENTS_DELETE,
    // Can manage events and companies
    Permission.EVENTS_READ,
    Permission.EVENTS_CREATE,
    Permission.EVENTS_UPDATE,
    Permission.EVENTS_DELETE,
    Permission.EVENTS_DISCOVER,
    Permission.COMPANIES_READ,
    Permission.COMPANIES_CREATE,
    Permission.COMPANIES_UPDATE,
    Permission.COMPANIES_DELETE,
    Permission.COMPANIES_ENRICH,
    Permission.PERSONAS_READ,
    Permission.PERSONAS_CREATE,
    Permission.PERSONAS_UPDATE,
    Permission.PERSONAS_DELETE,
    Permission.PERSONAS_ENRICH,
    // Can view jobs and logs
    Permission.JOBS_READ,
    Permission.JOBS_CREATE,
    Permission.JOBS_CANCEL,
    Permission.SYSTEM_LOGS,
    Permission.SYSTEM_METRICS,
  ],

  [Role.SALES]: [
    // Sales can read and execute, but not modify system
    Permission.PROMPTS_READ,
    Permission.PROMPTS_EVALUATE,
    Permission.AGENTS_READ,
    Permission.AGENTS_EXECUTE,
    Permission.EVENTS_READ,
    Permission.EVENTS_CREATE,
    Permission.EVENTS_UPDATE,
    Permission.COMPANIES_READ,
    Permission.COMPANIES_CREATE,
    Permission.COMPANIES_UPDATE,
    Permission.COMPANIES_ENRICH,
    Permission.PERSONAS_READ,
    Permission.PERSONAS_CREATE,
    Permission.PERSONAS_UPDATE,
    Permission.PERSONAS_ENRICH,
    Permission.OUTREACH_READ,
    Permission.OUTREACH_CREATE,
    Permission.OUTREACH_UPDATE,
    Permission.OUTREACH_EXECUTE,
    Permission.MEETINGS_READ,
    Permission.MEETINGS_CREATE,
    Permission.MEETINGS_UPDATE,
    Permission.JOBS_READ,
  ],

  [Role.VIEWER]: [
    // Viewer can only read
    Permission.PROMPTS_READ,
    Permission.AGENTS_READ,
    Permission.EVENTS_READ,
    Permission.COMPANIES_READ,
    Permission.PERSONAS_READ,
    Permission.OUTREACH_READ,
    Permission.MEETINGS_READ,
    Permission.JOBS_READ,
  ],
};
