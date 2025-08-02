# Seed Data Documentation

This directory contains seed data files for the outreach system. The data is split into multiple files for better organization and maintainability.

## File Structure

- **organizations.json** - Organizations and their admin users
- **signals.json** - Signal configurations and settings
- **events.json** - Events with venues and locations
- **companies.json** - Companies sponsoring events
- **personas.json** - Contact persons with their roles and contact channels
- **outreach-sequences.json** - Outreach sequences with email/LinkedIn templates

## Key Features

### Email Pattern

All seeded emails follow the pattern: `sabirmgd+[identifier]@gmail.com`

- Admin: `sabirmgd+admin@gmail.com`
- John Smith: `sabirmgd+johnsmith@gmail.com`
- etc.

### LinkedIn URLs

Using real LinkedIn profiles:

- https://www.linkedin.com/in/sharanjm/
- https://www.linkedin.com/in/sabir-moglad-a0b38b68/

### Complete Data

Every entity has ALL fields populated with realistic data:

- No nullable fields left empty unless necessary
- Proper enums and status values
- Realistic company descriptions and metrics
- Full outreach templates with subjects and bodies

### Idempotency

The seeding process is idempotent:

- Checks for existing records before creating
- Uses unique identifiers (email, linkedin_url, company name)
- Updates if exists, creates if not

## Running Seeds

1. Ensure all migrations are run first:

   ```bash
   npm run migration:run
   ```

2. Set the environment variable and run:
   ```bash
   RUN_SEEDS=true npm run start:dev
   ```

## Seed Data Overview

### Organizations (2)

- TechReach Solutions
- EventConnect Pro

### Signals (4)

- Enterprise Tech Conference Signal
- Series B Funding Signal
- Cybersecurity Conference Signal

### Events (4)

- Enterprise Tech Summit 2025
- AI Innovation Forum 2025
- Cloud Native Conference 2025
- InfoSec World 2025

### Companies (6)

- CloudScale Technologies
- DataStream Analytics
- NeuralTech Solutions
- SecureShield Technologies
- Quantum AI Labs
- ContainerTech Pro

### Personas (10)

- Various VPs, Directors, and C-level executives
- All with email and LinkedIn contact channels
- Proper role categorization and decision maker flags

### Outreach Sequences (3)

- Conference Sponsor Outreach Sequence (4 steps)
- Series B Funded Companies Outreach (2 steps)
- Cybersecurity Sponsor Engagement (3 steps)

Each sequence includes complete templates for:

- LinkedIn connection requests
- Email follow-ups
- Case studies
- Meeting requests
