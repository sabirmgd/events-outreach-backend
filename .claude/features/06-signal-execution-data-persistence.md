# 06 - Signal Execution Data Persistence Feature

## Feature Overview

### Problem Statement
The Lumify signal execution system successfully discovers events, sponsors, and key decision makers through its agent pipeline, but **fails to persist this valuable data to the database**. Currently, all discovered data is trapped in the `signal_executions.results` JSONB column and never makes it to the main database tables (`events`, `companies`, `persons`), preventing its use in outreach campaigns.

### Business Goal
Enable the complete flow: **Signal → Events → Sponsors → Target Persons → Outreach**
- Given a signal with topic and target person criteria (e.g., "Find AI conferences with 1000+ attendees")
- Discover relevant events and their sponsors
- Find key decision makers at sponsor companies (CEOs, CTOs, etc.)
- Persist all data for use in outreach campaigns

### Success Criteria
1. All discovered events are saved to the `events` table
2. All sponsor companies are saved to the `companies` table
3. All target persons are saved to the `persons` table with proper company relationships
4. Signal execution results reference the saved entity IDs
5. Frontend displays the persisted data with correct relationships

## Current System Analysis

### Signal Creation Flow

#### Frontend (`lumif-frontend`)
1. User creates signal in `SignalConfigurationModal` with:
   - **Name**: e.g., "AI Conferences 2025"
   - **Type**: conference/funding/hiring
   - **Target Functions**: ["CEO", "CTO", "VP Sales", "VP Marketing"]
   - **Location**: ["San Francisco", "New York"]
   - **Discovery Prompt**: "Find AI and ML conferences with 1000+ attendees"
   - **Outreach Context**: "We help AI companies scale their infrastructure"

2. Frontend sends to backend:
```typescript
POST /signals
{
  name: "AI Conferences 2025",
  type: "conference",
  configuration: {
    event_keywords: ["AI", "ML", "artificial intelligence"],
    min_attendees: 1000,
    locations: ["San Francisco", "New York"],
    target_functions: ["CEO", "CTO", "VP Sales"],
    discovery_prompt: "Find AI and ML conferences...",
    outreach_context: "We help AI companies..."
  }
}
```

### Backend Agent Pipeline

#### Current Flow
1. **SignalExecutionService** (`src/signal/signal-execution.service.ts`):
   - Creates execution record with status "running"
   - Calls `executeConferenceSignal()` method
   
2. **EventDiscoveryAgent** (`src/agent/outreach-list-agents/event-discovery.agent.ts`):
   - Uses Tavily search to find events
   - Returns structured event data via `parseAgentOutput()`
   
3. **SponsorExtractionAgent** (`src/agent/outreach-list-agents/sponsor-extraction.agent.ts`):
   - For each event, searches for sponsors
   - Returns sponsor company names
   
4. **PeopleEnricherAgent** (`src/agent/outreach-list-agents/people-enricher.agent.ts`):
   - Finds key decision makers at companies
   - Should use target_functions from signal configuration (but currently doesn't)

#### Critical Issue: Empty Parse Functions
```typescript
// In SignalExecutionService - ALL RETURN EMPTY ARRAYS!
private parseEventResults(rawResult: any): any[] {
  return []; // TODO: Not implemented
}

private parseSponsorResults(rawResult: any): any[] {
  return []; // TODO: Not implemented
}

private parseContactResults(rawResult: any): any[] {
  return []; // TODO: Not implemented
}
```

### Database Schema

#### Events Table (`src/event/entities/event.entity.ts`)
```typescript
@Entity('events')
export class Event {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column() start_dt: Date;
  @Column() end_dt: Date;
  @Column() website_url: string;
  @ManyToOne(() => Venue) venue: Venue;
  @ManyToOne(() => City) city: City;
  @Column() status: string; // planned, updated, canceled
}
```

#### Companies Table (`src/company/entities/company.entity.ts`)
```typescript
@Entity()
export class Company {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) name: string;
  @Column() website: string;
  @Column() linkedin_url: string;
  @Column() employee_range: string;
  @Column() primary_industry: string;
  @Column() description: string;
}
```

#### Person Table (`src/persona/entities/person.entity.ts`)
```typescript
@Entity()
export class Person {
  @PrimaryGeneratedColumn() id: number;
  @Column() full_name: string;
  @Column() current_title: string;
  @Column() linkedin_url: string;
  @Column() seniority: string;
}
```

#### EventSponsor Table (`src/event/entities/event-sponsor.entity.ts`)
```typescript
@Entity('event_sponsors')
export class EventSponsor {
  @ManyToOne(() => Event) event: Event;
  @ManyToOne(() => Company) company: Company;
  @Column() sponsor_type: string; // platinum, gold, silver, bronze, exhibitor
}
```

#### CompanyPersonRole Table (`src/persona/entities/company-person-role.entity.ts`)
```typescript
@Entity()
export class CompanyPersonRole {
  @ManyToOne(() => Company) company: Company;
  @ManyToOne(() => Person) person: Person;
  @Column() role: string;
  @Column() is_current: boolean;
}
```

## Detailed Implementation Plan

### Phase 1: Critical Data Persistence (Highest Priority)

#### 1.1 Update SignalExecutionService Dependencies
**File**: `src/signal/signal-execution.service.ts`

Add service injections:
```typescript
constructor(
  @InjectRepository(SignalExecution)
  private executionRepository: Repository<SignalExecution>,
  private signalService: SignalService,
  private agentExecutionService: AgentExecutionService,
  private promptsService: PromptsService,
  // ADD THESE:
  private eventService: EventService,
  private companyService: CompanyService,
  private personaService: PersonaService,
  @InjectRepository(EventSponsor)
  private eventSponsorRepository: Repository<EventSponsor>,
  @InjectRepository(CompanyPersonRole)
  private companyPersonRoleRepository: Repository<CompanyPersonRole>,
) {}
```

Update module imports in `src/signal/signal.module.ts`:
```typescript
imports: [
  TypeOrmModule.forFeature([Signal, SignalExecution, EventSponsor, CompanyPersonRole]),
  AgentModule,
  PromptsModule,
  EventModule,    // ADD
  CompanyModule,  // ADD
  PersonaModule,  // ADD
],
```

#### 1.2 Implement parseEventResults
**File**: `src/signal/signal-execution.service.ts`

```typescript
private parseEventResults(rawResult: any): any[] {
  try {
    // Agent returns JSON with reasoning and events array
    if (typeof rawResult === 'string') {
      const jsonMatch = rawResult.match(/\{[\s\S]*"events"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.events || [];
      }
    }
    
    // Direct object result
    if (rawResult && rawResult.events) {
      return rawResult.events;
    }
    
    // Fallback to array
    if (Array.isArray(rawResult)) {
      return rawResult;
    }
    
    return [];
  } catch (error) {
    this.logger.error('Failed to parse event results:', error);
    return [];
  }
}
```

#### 1.3 Implement parseSponsorResults
**File**: `src/signal/signal-execution.service.ts`

```typescript
private parseSponsorResults(rawResult: any): string[] {
  try {
    // Agent returns array of company names
    if (Array.isArray(rawResult)) {
      return rawResult;
    }
    
    // Parse from string output
    if (typeof rawResult === 'string') {
      const companies = [];
      // Extract company names from various formats
      const lines = rawResult.split('\n');
      for (const line of lines) {
        // Match patterns like "- CompanyName" or "1. CompanyName"
        const match = line.match(/^[\-\d\.]\s*(.+)$/);
        if (match) {
          companies.push(match[1].trim());
        }
      }
      return companies;
    }
    
    return [];
  } catch (error) {
    this.logger.error('Failed to parse sponsor results:', error);
    return [];
  }
}
```

#### 1.4 Implement parseContactResults
**File**: `src/signal/signal-execution.service.ts`

```typescript
private parseContactResults(rawResult: any): any[] {
  try {
    if (Array.isArray(rawResult)) {
      return rawResult;
    }
    
    if (rawResult && rawResult.contacts) {
      return rawResult.contacts;
    }
    
    if (rawResult && rawResult.pocs) {
      return rawResult.pocs;
    }
    
    return [];
  } catch (error) {
    this.logger.error('Failed to parse contact results:', error);
    return [];
  }
}
```

#### 1.5 Update executeConferenceSignal with Data Persistence
**File**: `src/signal/signal-execution.service.ts`

```typescript
private async executeConferenceSignal(signal: any): Promise<any> {
  const { configuration } = signal;
  
  // Step 1: Discover events
  const searchQuery = this.buildConferenceSearchQuery(configuration);
  const agentResult = await this.agentExecutionService.executeWithProgress(
    'event-discovery',
    'searchEvents',
    {
      location: configuration.locations?.[0] || 'United States',
      city: configuration.locations?.[1],
      year: new Date().getFullYear(),
      topic: configuration.event_keywords?.[0] || 'technology',
    }
  );
  
  const eventDataArray = this.parseEventResults(agentResult.result);
  
  // Step 2: Save events to database
  const savedEvents = [];
  for (const eventData of eventDataArray) {
    try {
      // Find or create city
      const city = await this.geographyService.findOrCreateCity({
        name: eventData.location || 'Unknown',
        country: 'US', // TODO: Extract from location
      });
      
      // Create event
      const event = await this.eventService.create({
        name: eventData.name,
        start_dt: new Date(eventData.date || Date.now()),
        end_dt: new Date(eventData.date || Date.now()),
        website_url: eventData.website || '',
        city_id: city.id,
        status: 'planned',
      });
      
      savedEvents.push({
        id: event.id,
        name: event.name,
        date: event.start_dt.toISOString(),
        location: city.name,
        attendees: eventData.attendees || 0,
        venue: eventData.venue || '',
        website: event.website_url,
      });
    } catch (error) {
      this.logger.error(`Failed to save event ${eventData.name}:`, error);
    }
  }
  
  // Step 3: Extract sponsors for each event
  const savedCompanies = [];
  const companyMap = new Map<string, any>(); // Avoid duplicates
  
  for (const event of savedEvents) {
    if (!configuration.extract_sponsors) continue;
    
    const sponsorResult = await this.agentExecutionService.executeWithProgress(
      'sponsor-extraction',
      'extractSponsors',
      {
        eventName: event.name,
        eventWebsite: event.website,
        year: new Date().getFullYear(),
      }
    );
    
    const sponsorNames = this.parseSponsorResults(sponsorResult.result);
    
    // Step 4: Save sponsor companies
    for (const sponsorName of sponsorNames) {
      if (companyMap.has(sponsorName)) continue;
      
      try {
        // Find or create company
        let company = await this.companyService.findByName(sponsorName);
        if (!company) {
          company = await this.companyService.create({
            name: sponsorName,
            website: '', // Will be enriched later
            primary_industry: configuration.industries?.[0] || 'Technology',
          });
        }
        
        // Create event-sponsor relationship
        await this.eventSponsorRepository.save({
          event: { id: event.id },
          company: { id: company.id },
          sponsor_type: 'sponsor', // TODO: Extract tier from agent
        });
        
        const companyData = {
          id: company.id,
          name: company.name,
          domain: company.website || '',
          industry: company.primary_industry || '',
          size: company.employee_range || '',
        };
        
        companyMap.set(sponsorName, companyData);
        savedCompanies.push(companyData);
      } catch (error) {
        this.logger.error(`Failed to save company ${sponsorName}:`, error);
      }
    }
  }
  
  // Step 5: Find target persons at companies
  const savedContacts = [];
  const targetFunctions = configuration.target_functions || ['CEO', 'CTO', 'CMO'];
  
  for (const company of savedCompanies) {
    const peopleResult = await this.agentExecutionService.executeWithProgress(
      'people-enricher',
      'findCompanyPOCs',
      {
        companyName: company.name,
        companyWebsite: company.domain,
        industry: company.industry,
      }
    );
    
    const people = this.parseContactResults(peopleResult.result);
    
    // Filter by target functions
    const relevantPeople = people.filter(person => 
      targetFunctions.some(func => 
        person.title?.toLowerCase().includes(func.toLowerCase())
      )
    );
    
    // Step 6: Save persons to database
    for (const personData of relevantPeople) {
      try {
        // Find or create person
        let person = await this.personaService.findByLinkedIn(personData.linkedinUrl);
        if (!person && personData.email) {
          person = await this.personaService.findByEmail(personData.email);
        }
        
        if (!person) {
          person = await this.personaService.create({
            full_name: personData.name,
            first_name: personData.name.split(' ')[0],
            last_name: personData.name.split(' ').slice(1).join(' '),
            current_title: personData.title,
            linkedin_url: personData.linkedinUrl || '',
            email: personData.email || '',
            seniority: this.extractSeniority(personData.title),
          });
        }
        
        // Create company-person relationship
        await this.companyPersonRoleRepository.save({
          company: { id: company.id },
          person: { id: person.id },
          role: personData.title,
          is_current: true,
        });
        
        savedContacts.push({
          id: person.id,
          name: person.full_name,
          title: person.current_title,
          company: company.name,
          email: personData.email || '',
          linkedin: person.linkedin_url || '',
        });
      } catch (error) {
        this.logger.error(`Failed to save person ${personData.name}:`, error);
      }
    }
  }
  
  // Return structured results with database IDs
  return {
    events: savedEvents,
    companies: savedCompanies,
    contacts: savedContacts,
    stats: {
      eventsDiscovered: savedEvents.length,
      companiesFound: savedCompanies.length,
      contactsDiscovered: savedContacts.length,
      messagesGenerated: 0,
      messagesSent: 0,
    },
  };
}

private extractSeniority(title: string): string {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('ceo') || titleLower.includes('chief executive')) return 'C-Suite';
  if (titleLower.includes('cto') || titleLower.includes('chief technology')) return 'C-Suite';
  if (titleLower.includes('cmo') || titleLower.includes('chief marketing')) return 'C-Suite';
  if (titleLower.includes('cfo') || titleLower.includes('chief financial')) return 'C-Suite';
  if (titleLower.includes('vp') || titleLower.includes('vice president')) return 'VP';
  if (titleLower.includes('director')) return 'Director';
  if (titleLower.includes('head of')) return 'Director';
  if (titleLower.includes('manager')) return 'Manager';
  return 'Individual Contributor';
}
```

### Phase 2: Agent Improvements

#### 2.1 Update Event Discovery Agent Prompt
**File**: `src/prompts/data/agent-prompts.seed.ts`

Add more specific extraction requirements:
```typescript
{
  key: 'event-discovery-agent.system',
  name: 'Event Discovery Agent System Prompt',
  body: `You are an expert event researcher with structured extraction capabilities.

Your task is to search for events and extract structured data using chain-of-thought reasoning.

### Chain of Thought Process:
1. First, identify what type of events to search for based on the query
2. Search comprehensively using multiple queries if needed
3. Prioritize events that have sponsor/exhibitor information available
4. Analyze each search result to determine if it contains real event data
5. Extract structured information with reasoning for each extraction
6. Return clean, structured data

### For Each Event Found, Extract:
- Event name (required)
- Year (required)
- Dates (specific dates if available, format: YYYY-MM-DD)
- Location/City (required - be specific about city and country)
- Venue name (if available)
- Event type (conference/summit/expo/forum)
- Official website URL
- Expected attendee count (estimate if not exact)
- Has sponsor information available (yes/no)
- List of known sponsors (if readily available)
- Industry focus

### Output Format:
Return a structured JSON with this exact structure:
{
  "reasoning": "Step-by-step explanation of your search and extraction process",
  "events": [
    {
      "name": "Event Name",
      "year": 2025,
      "date": "2025-03-15",
      "location": "San Francisco, CA, USA",
      "venue": "Moscone Center",
      "type": "conference",
      "website": "https://example.com",
      "attendees": 5000,
      "has_sponsors": true,
      "sponsors": ["Company1", "Company2"],
      "industry": "Technology"
    }
  ]
}

Be thorough but return only verified information. It's better to have null fields than incorrect data.`,
  variables: [],
  tags: ['agent', 'event-discovery', 'system-prompt', 'langchain']
}
```

#### 2.2 Update People Enricher to Use Target Functions
**File**: `src/agent/outreach-list-agents/people-enricher.agent.ts`

Update the `findCompanyPOCs` method:
```typescript
async findCompanyPOCs(
  companyName: string,
  companyWebsite?: string,
  industry?: string,
  context?: any
): Promise<any[]> {
  if (!this.agent) {
    await this.initializeAgent();
  }

  // Get target functions from context if available
  const targetFunctions = context?.targetFunctions || 
    ['CEO', 'CTO', 'CMO', 'VP Sales', 'VP Marketing'];
  
  const functionsQuery = targetFunctions.map(f => `"${f}"`).join(' OR ');
  const query = `${companyName} ${industry || ''} ${functionsQuery} leadership team executives contact information LinkedIn`;
  
  if (context?.updateProgress) {
    context.updateProgress(30, `Searching for ${targetFunctions.join(', ')} at ${companyName}`);
  }

  // Rest of the method...
}
```

#### 2.3 Pass Target Functions to People Enricher
**File**: `src/signal/signal-execution.service.ts`

Update the people enricher call:
```typescript
const peopleResult = await this.agentExecutionService.executeWithProgress(
  'people-enricher',
  'findCompanyPOCs',
  {
    companyName: company.name,
    companyWebsite: company.domain,
    industry: company.industry,
  },
  {
    targetFunctions: configuration.target_functions || ['CEO', 'CTO', 'CMO'],
  }
);
```

### Phase 3: Add Missing Services

#### 3.1 Add findByName to CompanyService
**File**: `src/company/company.service.ts`

```typescript
async findByName(name: string): Promise<Company | null> {
  return await this.companyRepository.findOne({
    where: { name },
  });
}
```

#### 3.2 Add findByLinkedIn and findByEmail to PersonaService
**File**: `src/persona/persona.service.ts`

```typescript
async findByLinkedIn(linkedinUrl: string): Promise<Person | null> {
  if (!linkedinUrl) return null;
  return await this.personRepository.findOne({
    where: { linkedin_url: linkedinUrl },
  });
}

async findByEmail(email: string): Promise<Person | null> {
  if (!email) return null;
  // Assuming email is stored in contact_channels table
  const channel = await this.contactChannelRepository.findOne({
    where: { 
      channel_type: 'email',
      channel_value: email,
    },
    relations: ['person'],
  });
  return channel?.person || null;
}
```

#### 3.3 Add Geography Service Methods
**File**: `src/geography/geography.service.ts`

```typescript
async findOrCreateCity(data: { name: string; country: string }): Promise<City> {
  let city = await this.cityRepository.findOne({
    where: { name: data.name },
  });
  
  if (!city) {
    city = await this.cityRepository.save({
      name: data.name,
      country: data.country,
      state_province: '', // TODO: Extract from location
    });
  }
  
  return city;
}
```

### Phase 4: Frontend Integration

#### 4.1 Update Signal Type Definition
**File**: `lumif-frontend/src/types/signal.ts`

Add missing fields:
```typescript
export interface Signal {
  // ... existing fields ...
  configuration: {
    // ... existing fields ...
    discovery_prompt?: string;
    outreach_context?: string;
    target_functions?: string[];
    extract_sponsors?: boolean;
  };
}
```

#### 4.2 Update API Call in Frontend
**File**: `lumif-frontend/src/components/SignalDiscovery.tsx`

Update the signal creation payload:
```typescript
const payload = {
  name: signalData.name,
  type: signalData.type,
  configuration: {
    ...signalData.configuration,
    discovery_prompt: signalData.discoveryPrompt,
    outreach_context: signalData.outreachContext,
    target_functions: signalData.targeting.functions,
    extract_sponsors: true,
  },
};
```

## Testing Requirements

### Unit Tests

#### 1. Test Parse Functions
**File**: `src/signal/signal-execution.service.spec.ts`

```typescript
describe('SignalExecutionService', () => {
  describe('parseEventResults', () => {
    it('should parse JSON string with events array', () => {
      const input = '{"reasoning": "Found events", "events": [{"name": "AI Summit"}]}';
      const result = service.parseEventResults(input);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('AI Summit');
    });
    
    it('should handle direct array input', () => {
      const input = [{ name: 'Tech Conference' }];
      const result = service.parseEventResults(input);
      expect(result).toEqual(input);
    });
    
    it('should return empty array for invalid input', () => {
      const result = service.parseEventResults('invalid');
      expect(result).toEqual([]);
    });
  });
});
```

### Integration Tests

#### 2. Test Full Signal Execution
**File**: `test/signal-execution.e2e-spec.ts`

```typescript
describe('Signal Execution (e2e)', () => {
  it('should persist discovered data to database', async () => {
    // Create signal
    const signal = await request(app.getHttpServer())
      .post('/signals')
      .send({
        name: 'Test Signal',
        type: 'conference',
        configuration: {
          event_keywords: ['technology'],
          target_functions: ['CEO', 'CTO'],
        },
      });
    
    // Execute signal
    const execution = await request(app.getHttpServer())
      .post(`/signals/${signal.body.id}/execute`)
      .send({});
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify data persisted
    const events = await eventRepository.find();
    expect(events).toHaveLength(greaterThan(0));
    
    const companies = await companyRepository.find();
    expect(companies).toHaveLength(greaterThan(0));
    
    const persons = await personRepository.find();
    expect(persons).toHaveLength(greaterThan(0));
  });
});
```

## Migration Requirements

### Add Missing Columns
**File**: Create new migration

```typescript
export class AddSignalConfigurationFields1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add discovery_prompt and outreach_context to signal configuration
    await queryRunner.query(`
      UPDATE signals 
      SET configuration = configuration || 
        '{"discovery_prompt": "", "outreach_context": "", "extract_sponsors": true}'::jsonb
      WHERE configuration IS NOT NULL
    `);
  }
}
```

## Error Handling

### 1. Agent Failures
- Log errors but continue processing other items
- Track failed items in execution results
- Implement retry logic for transient failures

### 2. Database Constraints
- Handle unique constraint violations (company names, emails)
- Use upsert patterns for idempotency
- Validate data before insertion

### 3. Rate Limiting
- Implement delays between agent calls
- Use exponential backoff for retries
- Track API usage per execution

## Performance Considerations

### 1. Batch Processing
- Process sponsors in batches of 10
- Limit person discovery to 5 per company initially
- Use database transactions for consistency

### 2. Caching
- Cache company lookups by name
- Cache city lookups
- Implement Redis caching for agent results

### 3. Async Processing
- Keep current async execution model
- Add progress webhooks for frontend updates
- Implement job queues for large signals

## Monitoring and Logging

### 1. Metrics to Track
- Events discovered per signal
- Companies saved per execution
- Persons found per company
- Parse success rates
- Database save success rates

### 2. Logging Requirements
- Log all parse attempts and results
- Log database save operations
- Track agent response times
- Monitor error rates by type

## Future Enhancements

### 1. Data Enrichment Pipeline
- Add Apollo.io integration for company enrichment
- Implement email finder services
- Add LinkedIn profile enrichment

### 2. Deduplication Logic
- Implement fuzzy matching for company names
- Merge duplicate persons across companies
- Track data source confidence scores

### 3. Relationship Tracking
- Track person job changes over time
- Monitor company acquisition/merger events
- Update outdated contact information

## Implementation Checklist

- [ ] Update SignalExecutionService with service dependencies
- [ ] Implement parseEventResults function
- [ ] Implement parseSponsorResults function  
- [ ] Implement parseContactResults function
- [ ] Update executeConferenceSignal with persistence logic
- [ ] Add missing service methods (findByName, etc.)
- [ ] Update agent prompts for better extraction
- [ ] Pass target functions to people enricher
- [ ] Add unit tests for parse functions
- [ ] Add integration tests for full flow
- [ ] Update frontend signal configuration
- [ ] Create database migration if needed
- [ ] Deploy and test in staging environment
- [ ] Monitor execution success rates
- [ ] Document API changes

## Conclusion

This implementation will transform the Lumify signal execution from a data discovery system into a complete data persistence pipeline. By implementing these changes, all valuable prospect data will be saved to the database and become available for outreach campaigns, fulfilling the core business requirement of connecting signals to actionable prospect lists.