# Events Outreach Backend

A B2B outreach automation platform built with NestJS, featuring event discovery, sponsor extraction, and automated outreach capabilities.

## Overview

This platform follows the workflow: **Event → Sponsor → Company → Persona → Outreach → Meeting**

### Key Features

- **Event Discovery**: Automated event discovery and management
- **Company Enrichment**: Company data enrichment with vector similarity search using pgvector
- **Multi-channel Outreach**: Email and LinkedIn automation
- **Meeting Scheduling**: Cal.com integration for automated scheduling
- **Agent Framework**: Decorator-based agents with real-time execution tracking
- **CASL Authentication**: Fine-grained permission control with role-based access

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (with pgvector extension)
- Redis
- Docker (optional, for running services via docker-compose)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd events-outreach-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=events_outreach_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
PORT=3000
NODE_ENV=dev

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRES_IN=15m

# API Keys
PERPLEXITY_API_KEY=your_perplexity_api_key
TAVILY_API_KEY=your_tavily_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# CORS Configuration (comma-separated list of allowed origins)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://192.168.29.165:8080

# Optional: Run database seeds on startup
RUN_SEEDS=false
```

### 4. Start required services

Using Docker:
```bash
docker-compose up -d
```

Or manually start PostgreSQL and Redis.

### 5. Create the database

```bash
createdb events_outreach_db
```

### 6. Run database migrations

```bash
# Reset database (WARNING: This will delete all data)
psql -h localhost -p 5432 -U your_user -d events_outreach_db -f scripts/reset-database.sql

# Run all migrations
npm run migration:run
```

### 7. Start the application

```bash
# Development mode with watch
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Default Users

After running migrations, the following users are available:

- **Admin**: `admin@lumify.ai` / `admin123!` (ADMIN role)
- **User**: `user@lumify.ai` / `user123!` (USER role)

## CORS Configuration

The application supports dynamic CORS configuration through environment variables:

### Environment Variable
Set `CORS_ALLOWED_ORIGINS` in your `.env` file with comma-separated allowed origins:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://192.168.29.165:8080
```

### Development Mode
In development mode (`NODE_ENV=dev`), CORS allows all origins for easier testing.

### Production Mode
In production, only origins listed in `CORS_ALLOWED_ORIGINS` are allowed.

### CORS Settings
- **Methods**: `GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS`
- **Credentials**: Enabled (cookies and authorization headers supported)
- **Preflight**: Handled automatically

## Database Management

### Migration Commands

```bash
# Generate a new migration based on entity changes
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Reset database completely
npm run db:reset
```

## API Documentation

The API follows RESTful conventions with JWT authentication.

### Authentication Endpoints
- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout (requires auth)
- `POST /auth/refresh` - Refresh access token

### Protected Endpoints
All other endpoints require authentication via Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

## Architecture

### Core Modules

- **AuthModule**: JWT authentication with CASL permissions
- **OrganizationModule**: Multi-tenant organization management
- **EventModule**: Event discovery and management
- **CompanyModule**: Company data with vector embeddings
- **PersonaModule**: Contact management
- **OutreachModule**: Outreach automation
- **AgentModule**: AI-powered agents for various tasks
- **PromptsModule**: Versioned prompt management

### Technology Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with pgvector extension
- **ORM**: TypeORM
- **Queue**: BullMQ with Redis
- **Authentication**: Passport.js with JWT
- **Authorization**: CASL
- **AI/LLM**: LangChain with Anthropic/Perplexity
- **Real-time**: Socket.io

## Development

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

### Project Structure

```
src/
├── auth/           # Authentication & authorization
├── admin/          # Admin operations & seeding
├── agent/          # Agent framework & implementations
├── company/        # Company management
├── event/          # Event management
├── geography/      # Location services
├── jobs/           # Background job processing
├── meeting/        # Meeting scheduling
├── organization/   # Multi-tenant support
├── outreach/       # Outreach automation
├── persona/        # Contact management
├── prompts/        # Prompt management
├── queue/          # Queue management
├── tools/          # AI/LLM tools
└── user/           # User management
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify the database exists

2. **Migration errors**
   - Reset the database and run migrations again
   - Check for PostgreSQL extensions: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

3. **CORS errors**
   - Add your frontend URL to `CORS_ALLOWED_ORIGINS`
   - Ensure credentials are included in frontend requests

4. **Authentication errors**
   - Check JWT_SECRET is set
   - Verify token expiration settings

## License

[MIT licensed](LICENSE)