# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Common Commands
```bash
# Install dependencies
npm install

# Run development server
npm run start:dev

# Run production build
npm run build
npm run start:prod

# Run tests
npm test                 # Run all unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage
npm run test:e2e        # Run end-to-end tests

# Linting and formatting
npm run lint            # Run ESLint
npm run format          # Run Prettier

# Database migrations
npm run migration:generate -- -n MigrationName  # Generate migration
npm run migration:run                           # Run migrations
npm run migration:revert                        # Revert last migration

# Start required services (PostgreSQL + Redis)
docker-compose up -d
```

## Architecture Overview

This is a NestJS-based B2B outreach automation platform with the following core workflow:
**Event → Sponsor → Company → Persona → Outreach → Meeting**

### Key Modules and Their Responsibilities

- **Auth Module**: JWT-based authentication with passport strategies and guards
- **Event Module**: Event discovery and management, serves as the entry point for lead generation
- **Company Module**: Company data enrichment with vector similarity search using pgvector embeddings
- **Persona Module**: Contact/person management linked to companies
- **Outreach Module**: Multi-channel outreach sequences (Email + LinkedIn automation)
- **Meeting Module**: Meeting scheduling with Cal.com webhook integration
- **Jobs Module**: Background job processing using BullMQ/Redis for async tasks like scraping and enrichment
- **Tools Module**: AI/LLM integration providers (Perplexity, Google Gemini) via LangChain
- **Prompts Module**: Versioned prompt management with variable interpolation and evaluation capabilities
- **Agent Module**: Decorator-based agent framework with real-time execution tracking via WebSockets

### Database Architecture

- **PostgreSQL** with **pgvector** extension for similarity search
- **TypeORM** for database operations with entity relationships
- Vector embeddings stored for company similarity matching
- Comprehensive entity relationships documented in `notes/database.md`

### Queue System

- **BullMQ** with **Redis** for background job processing
- Job types include: event scraping, company enrichment, outreach automation
- Separate queues for different job priorities and types

### External Integrations

- **Apollo.io**: Company and person data enrichment
- **Mailgun**: Email delivery
- **Cal.com**: Meeting scheduling via webhooks
- **Perplexity/Gemini**: AI capabilities for content generation and analysis

### Environment Configuration

Required environment variables:
- Database credentials (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE)
- Redis configuration (REDIS_HOST, REDIS_PORT)
- API keys (PERPLEXITY_API_KEY, JWT_SECRET, etc.)
- Service URLs and configurations

### Path Aliases

TypeScript path aliases are configured:
- `@/` → `src/`
- `@jobs/` → `src/jobs/`
- `@tools/` → `src/tools/`
- `@geography/` → `src/geography/`
- `@company/` → `src/company/`
- `@event/` → `src/event/`
- `@queue/` → `src/queue/`
- `@clients/` → `src/clients/`

### Testing Strategy

- Unit tests colocated with modules (`.spec.ts` files)
- E2E tests in separate directory with dedicated configuration
- Jest configured with TypeScript support

### RBAC System

- **Role-based access control** with four roles: ADMIN, OPS, SALES, VIEWER
- **Permission-based guards** for fine-grained access control
- **Hierarchical roles** where higher roles inherit lower role permissions
- Use `@RequirePermissions()` decorator on endpoints to enforce permissions

### Key Features

- **Prompts System**: Create versioned prompts with {{variable}} syntax, test with evaluations, and track metrics
- **Agent Framework**: Build agents using decorators, auto-discovery at startup, real-time progress via WebSocket
- **WebSocket Support**: Real-time updates for agent execution and prompt evaluations
- **Example Agents**: Event discovery and company enrichment agents demonstrate the system

See `PROMPTS_AND_AGENTS.md` for detailed documentation on these systems.