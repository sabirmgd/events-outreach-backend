# Feature: Merge lumif.ai/backend Advanced AI Capabilities

## Executive Summary

This feature integrates advanced AI capabilities from the lumif.ai/backend repository into the events-outreach-backend. The primary enhancements include BAML (Boundary AI Markup Language) support for structured LLM outputs, LangChain integration for sophisticated agent workflows, and production-ready agent implementations for event discovery and data enrichment.

### Key Integrations:
- **BAML Framework**: Structured output parsing for LLM responses
- **LangChain Agents**: Tool-calling agents with chain-of-thought reasoning
- **Tavily Search**: Advanced web search capabilities for real-time data
- **Concrete Agents**: Event discovery, sponsor extraction, and people enrichment
- **Prompt Seeding**: Pre-configured prompts for agent operations

## Technical Architecture

### Current Architecture (events-outreach-backend)
```
- NestJS framework with modular architecture
- Agent system with decorators and WebSocket support
- Prompts module with versioning and evaluations
- PostgreSQL with pgvector for embeddings
- BullMQ for job processing
```

### Enhancements from lumif.ai/backend
```
- BAML for structured LLM output parsing
- LangChain for agent orchestration
- Tavily for web search
- Concrete agent implementations
- Agent-specific prompt templates
```

## Implementation Guide

### Phase 1: Install Dependencies

Add these packages to package.json:

```json
{
  "dependencies": {
    "@boundaryml/baml": "^0.202.1",
    "@langchain/core": "^0.1.63",
    "@langchain/anthropic": "^0.1.21",
    "langchain": "^0.1.37",
    "zod": "^3.23.8"
  }
}
```

Run: `npm install`

### Phase 2: Environment Configuration

Add to .env:
```
TAVILY_API_KEY=your_tavily_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Update src/config/app.config.ts:
```typescript
export default registerAs('app', () => ({
  // ... existing config
  tavily: {
    apiKey: process.env.TAVILY_API_KEY,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
}));
```

### Phase 3: BAML Setup

Create directory structure:
```bash
mkdir -p src/agent/baml_src/event-analysis/functions
mkdir -p src/agent/baml_src/shared
```

Create src/agent/baml_src/generators.baml:
```baml
generator target {
    output_type "typescript"
    output_dir "../baml_client"
    version "0.202.1"
    default_client_mode async
}
```

Create src/agent/baml_src/shared/clients.baml:
```baml
client<llm> GPT4 {
  provider openai
  options {
    model "gpt-4"
    temperature 0
  }
}

client<llm> Claude3 {
  provider anthropic
  options {
    model "claude-3-5-sonnet-20241022"
    max_tokens 4096
    temperature 0
  }
}
```

Create src/agent/baml_src/shared/config.baml:
```baml
retry_policy ExpBackoff {
  max_retries 3
  strategy {
    type exponential_backoff
    initial_delay_ms 1000
    max_delay_ms 10000
    multiplier 2
  }
}
```

Create src/agent/baml_src/event-analysis/models.baml:
```baml
class Event {
  name string
  year int
  dates string?
  venue string?
  city string
  country string?
  industry string
  attendeeCount int?
  description string?
  website string?
  organizer string?
  type string?
}

class Company {
  name string
  website string?
  industry string?
  description string?
  headquarters string?
  founded int?
  employeesRange string?
}

class Sponsor {
  company Company
  sponsorshipTier string?
}

class Person {
  name string
  title string?
  company string?
  email string?
  phone string?
  linkedinUrl string?
  bio string?
  location string?
  expertise string[]?
  sessionType string?
  topic string?
  role string?
}

class EventWithDetails {
  event Event
  sponsors Sponsor[]
  speakers Person[]
}
```

Create src/agent/baml_src/event-analysis/functions/event_researcher.baml:
```baml
function ResearchEvents(location: string, year: int, topic: string) -> EventWithDetails[] {
  client Claude3
  retry_policy ExpBackoff
  
  prompt #"
    You are an expert event researcher. Search for {{topic}} events in {{location}} for the year {{year}}.
    
    Find major conferences, summits, and expos related to {{topic}}.
    
    For each event found, extract:
    - Event details (name, dates, venue, website)
    - List of sponsors with their company information
    - List of speakers with their professional details
    
    Return structured data following the schema.
    Only include verified information. Use null for unknown fields.
  "#
}
```

Run BAML code generation:
```bash
npx baml generate
```

### Phase 4: Tavily Search Tool

Create src/agent/tools/tavily-search.tool.ts:
```typescript
import { Tool } from "@langchain/core/tools";
import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";

interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
  score: number;
  raw_content?: string | null;
}

interface TavilyAPIResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string | null;
  images?: string[];
  response_time?: number;
}

export class TavilySearchTool extends Tool {
  name = "tavily_search_results_json";
  description = "A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events. Input should be a search query.";
  
  private apiKey: string;
  private maxResults: number;
  private apiUrl: string;
  private includeRawContent: boolean;
  private searchDepth: "basic" | "advanced";

  constructor(fields?: {
    apiKey?: string;
    maxResults?: number;
    apiUrl?: string;
    includeRawContent?: boolean;
    searchDepth?: "basic" | "advanced";
  }) {
    super();
    this.apiKey = fields?.apiKey || process.env.TAVILY_API_KEY || "";
    this.maxResults = fields?.maxResults || 5;
    this.apiUrl = fields?.apiUrl || "https://api.tavily.com/search";
    this.includeRawContent = fields?.includeRawContent ?? false;
    this.searchDepth = fields?.searchDepth || "advanced";

    if (!this.apiKey) {
      throw new Error("Tavily API key is required. Please set TAVILY_API_KEY environment variable or pass it in the constructor.");
    }
  }

  protected async _call(
    input: string,
    _runManager?: CallbackManagerForToolRun
  ): Promise<string> {
    try {
      const requestBody = {
        api_key: this.apiKey,
        query: input,
        max_results: this.maxResults,
        include_answer: true,
        include_raw_content: this.includeRawContent,
        search_depth: this.searchDepth,
        include_images: true
      };

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as TavilyAPIResponse;
      return JSON.stringify(data);
    } catch (error) {
      console.error("[TavilySearchTool] Error calling Tavily API:", error);
      throw error;
    }
  }
}
```

### Phase 5: Agent Implementations

Create src/agents directory and move example agents:
```bash
mkdir -p src/agents/outreach-list-agents
```

Create src/agents/outreach-list-agents/event-discovery.agent.ts:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../../agent/tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { Agent, AgentMethod } from '../../agent/decorators';

@Agent({
  id: 'event-discovery',
  name: 'Event Discovery Agent',
  description: 'Discovers and extracts structured event information using chain-of-thought reasoning',
  category: 'discovery'
})
@Injectable()
export class EventDiscoveryAgent {
  private readonly logger = new Logger(EventDiscoveryAgent.name);
  private agent: AgentExecutor;
  private topic: string = 'technology';
  
  constructor(
    private configService: ConfigService,
    private promptsService: PromptsService,
  ) {}

  private async initializeAgent() {
    const tools = [
      new TavilySearchTool({
        apiKey: this.configService.get('TAVILY_API_KEY'),
        maxResults: 10,
        includeRawContent: false,
      }),
    ];

    const llm = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0,
      anthropicApiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });

    let systemPrompt: string;
    try {
      systemPrompt = await this.promptsService.getPublishedPromptBody('event-discovery-agent.system');
    } catch (error) {
      this.logger.warn('Failed to fetch system prompt from database, using fallback');
      systemPrompt = await this.getDefaultSystemPrompt();
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}']
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });
    
    this.agent = new AgentExecutor({ 
      agent, 
      tools,
      verbose: false,
      maxIterations: 5,
    });
  }

  private async getDefaultSystemPrompt(): string {
    return `You are an expert event researcher with structured extraction capabilities.

Your task is to search for events and extract structured data using chain-of-thought reasoning.

### Chain of Thought Process:
1. First, identify what type of events to search for based on the query
2. Search comprehensively using multiple queries if needed
3. Analyze each search result to determine if it contains real event data
4. Extract structured information with reasoning for each extraction
5. Return clean, structured data

### For Each Event Found, Extract:
- Event name (required)
- Year (required)
- Dates (if available)
- Location/Venue (if available)
- Event type (conference/summit/expo/forum)
- Official website
- List of sponsors (just company names)
- List of speakers (just names)
- Attendee count estimate

### Output Format:
Return a structured JSON array of events with your reasoning process. The JSON should have this structure:
- reasoning: Step-by-step explanation of your search and extraction process
- events: Array of event objects

Be thorough but return only verified information. It's better to have null fields than incorrect data.`;
  }

  @AgentMethod({
    displayName: 'Search Events',
    description: 'Search for events in a specific location and year',
    parameters: [
      {
        name: 'location',
        type: 'string',
        description: 'Country or region for the event search',
        required: true,
        example: 'United States'
      },
      {
        name: 'city',
        type: 'string',
        description: 'Specific city for the event search',
        required: false,
        example: 'San Francisco'
      },
      {
        name: 'year',
        type: 'number',
        description: 'Year to search for events',
        required: true,
        example: 2024
      },
      {
        name: 'topic',
        type: 'string',
        description: 'Topic or industry focus',
        required: false,
        default: 'technology',
        example: 'healthcare'
      }
    ]
  })
  async searchEvents(
    location: string, 
    city: string, 
    year: number, 
    topic: string = 'technology',
    context?: any
  ): Promise<any[]> {
    this.logger.log(`Searching for ${topic} events in ${city || location} for ${year}`);
    this.topic = topic;

    if (!this.agent) {
      await this.initializeAgent();
    }

    const searchLocation = city ? `${city}, ${location}` : location;
    const searchInstruction = `
Search for ${topic} events in ${searchLocation} for the year ${year}.

Perform multiple searches to find:
1. Major ${topic} conferences, summits, and expos
2. Their official websites
3. Lists of sponsors and exhibitors
4. Speaker lineups

Extract structured data for each event found.`;

    if (context?.reportProgress) {
      await context.reportProgress(30, 'Executing search with LangChain agent');
    }
    
    let result;
    let retries = 3;
    
    while (retries > 0) {
      try {
        result = await this.agent.invoke({ input: searchInstruction });
        break;
      } catch (error) {
        if (error.error?.error?.type === 'overloaded_error' && retries > 1) {
          this.logger.warn(`API overloaded, retrying... (${retries - 1} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries--;
        } else {
          throw error;
        }
      }
    }

    if (context?.reportProgress) {
      await context.reportProgress(70, 'Parsing and structuring results');
    }
    
    return this.parseAgentOutput(result.output);
  }

  private parseAgentOutput(output: any): any[] {
    try {
      let outputText = output;
      if (typeof output === 'object' && output.text) {
        outputText = output.text;
      }
      
      const jsonMatch = outputText.match(/\{[\s\S]*"reasoning"[\s\S]*"events"[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON structure found in output');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      this.logger.log('Chain of thought reasoning:', parsed.reasoning);
      
      return parsed.events || [];
    } catch (error) {
      this.logger.error('Failed to parse agent output:', error);
      return [];
    }
  }
}
```

Create src/agents/outreach-list-agents/sponsor-extraction.agent.ts:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../../agent/tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { Agent, AgentMethod } from '../../agent/decorators';

@Agent({
  id: 'sponsor-extraction',
  name: 'Sponsor Extraction Agent',
  description: 'Extracts and enriches sponsor information from events',
  category: 'extraction'
})
@Injectable()
export class SponsorExtractionAgent {
  private readonly logger = new Logger(SponsorExtractionAgent.name);
  private agent: AgentExecutor;
  
  constructor(
    private configService: ConfigService,
    private promptsService: PromptsService,
  ) {}

  private async initializeAgent() {
    const tools = [
      new TavilySearchTool({
        apiKey: this.configService.get('TAVILY_API_KEY'),
        maxResults: 5,
        includeRawContent: false,
      }),
    ];

    const llm = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0,
      anthropicApiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });

    let systemPrompt: string;
    try {
      systemPrompt = await this.promptsService.getPublishedPromptBody('sponsor-extraction-agent.system');
    } catch (error) {
      systemPrompt = 'You are a search agent. Use the tavily_search_results_json tool to search for information and return the raw results. Do not process or structure the data.';
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}']
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });
    this.agent = new AgentExecutor({ agent, tools, verbose: false });
  }

  @AgentMethod({
    displayName: 'Extract Event Sponsors',
    description: 'Extract sponsor companies from an event',
    parameters: [
      {
        name: 'eventName',
        type: 'string',
        description: 'Name of the event',
        required: true
      },
      {
        name: 'eventWebsite',
        type: 'string',
        description: 'Event website URL',
        required: false
      },
      {
        name: 'year',
        type: 'number',
        description: 'Event year',
        required: true
      }
    ]
  })
  async extractSponsors(
    eventName: string,
    eventWebsite: string,
    year: number,
    context?: any
  ): Promise<any> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `${eventName} ${year} sponsors exhibitors partners companies`;
    
    if (context?.reportProgress) {
      await context.reportProgress(30, 'Searching for sponsor information');
    }

    const result = await this.agent.invoke({ input: query });
    
    if (context?.reportProgress) {
      await context.reportProgress(70, 'Processing sponsor data');
    }

    return this.parseSponsors(result.output);
  }

  @AgentMethod({
    displayName: 'Enrich Sponsor',
    description: 'Enrich sponsor company information',
    parameters: [
      {
        name: 'companyName',
        type: 'string',
        description: 'Company name',
        required: true
      }
    ]
  })
  async enrichSponsor(companyName: string, context?: any): Promise<any> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `${companyName} company website industry headquarters employees founded`;
    
    const result = await this.agent.invoke({ input: query });
    
    return this.parseCompanyInfo(result.output, companyName);
  }

  private parseSponsors(output: any): string[] {
    // Extract company names from search results
    // This is a simplified version - enhance based on actual needs
    const sponsors: string[] = [];
    
    try {
      const data = JSON.parse(output);
      if (data.results) {
        data.results.forEach(result => {
          // Extract company names from content
          const companyPattern = /(?:sponsors?|exhibitors?|partners?)[\s:]+([A-Z][A-Za-z\s&,]+)/gi;
          const matches = result.content.matchAll(companyPattern);
          for (const match of matches) {
            sponsors.push(match[1].trim());
          }
        });
      }
    } catch (error) {
      this.logger.error('Error parsing sponsors:', error);
    }
    
    return [...new Set(sponsors)];
  }

  private parseCompanyInfo(output: any, companyName: string): any {
    try {
      const data = JSON.parse(output);
      
      return {
        name: companyName,
        website: this.extractWebsite(data),
        industry: this.extractIndustry(data),
        headquarters: this.extractHeadquarters(data),
        employeesRange: this.extractEmployees(data),
        founded: this.extractFounded(data),
      };
    } catch (error) {
      this.logger.error('Error parsing company info:', error);
      return { name: companyName };
    }
  }

  private extractWebsite(data: any): string | null {
    // Extract website from search results
    if (data.results?.[0]?.url) {
      const url = new URL(data.results[0].url);
      return url.origin;
    }
    return null;
  }

  private extractIndustry(data: any): string | null {
    // Extract industry from content
    const industryPattern = /(?:industry|sector)[\s:]+([A-Za-z\s]+)/i;
    for (const result of data.results || []) {
      const match = result.content.match(industryPattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  private extractHeadquarters(data: any): string | null {
    // Extract headquarters location
    const hqPattern = /(?:headquarters?|based in|located in)[\s:]+([A-Za-z\s,]+)/i;
    for (const result of data.results || []) {
      const match = result.content.match(hqPattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  private extractEmployees(data: any): string | null {
    // Extract employee count
    const empPattern = /(\d+[,\d]*)\s*(?:employees?|staff)/i;
    for (const result of data.results || []) {
      const match = result.content.match(empPattern);
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ''));
        if (count < 50) return '1-50';
        if (count < 200) return '51-200';
        if (count < 1000) return '201-1000';
        if (count < 5000) return '1001-5000';
        return '5000+';
      }
    }
    return null;
  }

  private extractFounded(data: any): number | null {
    // Extract founding year
    const foundedPattern = /(?:founded|established)[\s:]+(?:in\s+)?(\d{4})/i;
    for (const result of data.results || []) {
      const match = result.content.match(foundedPattern);
      if (match) return parseInt(match[1]);
    }
    return null;
  }
}
```

Create src/agents/outreach-list-agents/people-enricher.agent.ts:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../../agent/tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { Agent, AgentMethod } from '../../agent/decorators';

@Agent({
  id: 'people-enricher',
  name: 'People Enricher Agent',
  description: 'Enriches person and contact information',
  category: 'enrichment'
})
@Injectable()
export class PeopleEnricherAgent {
  private readonly logger = new Logger(PeopleEnricherAgent.name);
  private agent: AgentExecutor;
  
  constructor(
    private configService: ConfigService,
    private promptsService: PromptsService,
  ) {}

  private async initializeAgent() {
    const tools = [
      new TavilySearchTool({
        apiKey: this.configService.get('TAVILY_API_KEY'),
        maxResults: 5,
        includeRawContent: false,
      }),
    ];

    const llm = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0,
      anthropicApiKey: this.configService.get('ANTHROPIC_API_KEY'),
    });

    let systemPrompt: string;
    try {
      systemPrompt = await this.promptsService.getPublishedPromptBody('people-enricher.system');
    } catch (error) {
      systemPrompt = 'You are a people data enrichment specialist. Find missing contact information and professional details. For POCs, focus on key decision makers: CEO, CTO, CMO, Sales Head, Marketing Head. Only fill null fields, never overwrite existing data.';
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}']
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });
    this.agent = new AgentExecutor({ agent, tools, verbose: false });
  }

  @AgentMethod({
    displayName: 'Find Company POCs',
    description: 'Find key decision makers at a company',
    parameters: [
      {
        name: 'companyName',
        type: 'string',
        description: 'Company name',
        required: true
      },
      {
        name: 'companyWebsite',
        type: 'string',
        description: 'Company website',
        required: false
      },
      {
        name: 'industry',
        type: 'string',
        description: 'Company industry',
        required: false
      }
    ]
  })
  async findCompanyPOCs(
    companyName: string,
    companyWebsite?: string,
    industry?: string,
    context?: any
  ): Promise<any[]> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `${companyName} ${industry || ''} CEO CTO CMO "head of sales" "VP marketing" leadership team executives contact information`;
    
    if (context?.reportProgress) {
      await context.reportProgress(30, 'Searching for company leadership');
    }

    const result = await this.agent.invoke({ input: query });
    
    if (context?.reportProgress) {
      await context.reportProgress(70, 'Processing contact information');
    }

    return this.parsePOCs(result.output, companyName);
  }

  @AgentMethod({
    displayName: 'Enrich Person',
    description: 'Enrich person contact information',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Person name',
        required: true
      },
      {
        name: 'company',
        type: 'string',
        description: 'Person company',
        required: false
      },
      {
        name: 'title',
        type: 'string',
        description: 'Person title',
        required: false
      }
    ]
  })
  async enrichPerson(
    name: string,
    company?: string,
    title?: string,
    context?: any
  ): Promise<any> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `${name} ${company || ''} ${title || ''} email LinkedIn contact`;
    
    const result = await this.agent.invoke({ input: query });
    
    return this.parsePersonInfo(result.output, name, company, title);
  }

  private parsePOCs(output: any, companyName: string): any[] {
    const pocs: any[] = [];
    
    try {
      const data = JSON.parse(output);
      
      // Common C-suite titles to look for
      const targetTitles = ['CEO', 'CTO', 'CMO', 'VP Sales', 'VP Marketing', 'Head of Sales', 'Head of Marketing'];
      
      for (const result of data.results || []) {
        // Extract names with titles
        const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+)\s*,?\s*(CEO|CTO|CMO|VP|Head of|Director)/gi;
        const matches = result.content.matchAll(namePattern);
        
        for (const match of matches) {
          const name = match[1];
          const title = match[2];
          
          if (!pocs.find(p => p.name === name)) {
            pocs.push({
              name,
              title: this.normalizeTitle(title),
              company: companyName,
              email: null,
              phone: null,
              linkedinUrl: null,
              location: null,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error parsing POCs:', error);
    }
    
    return pocs.slice(0, 5); // Return top 5 POCs
  }

  private parsePersonInfo(output: any, name: string, company?: string, title?: string): any {
    try {
      const data = JSON.parse(output);
      
      const personInfo = {
        name,
        title,
        company,
        email: null,
        phone: null,
        linkedinUrl: null,
        bio: null,
        location: null,
      };
      
      for (const result of data.results || []) {
        // Extract email
        if (!personInfo.email) {
          const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
          const emailMatch = result.content.match(emailPattern);
          if (emailMatch) personInfo.email = emailMatch[1];
        }
        
        // Extract LinkedIn
        if (!personInfo.linkedinUrl) {
          const linkedinPattern = /linkedin\.com\/in\/([a-zA-Z0-9-]+)/;
          const linkedinMatch = result.content.match(linkedinPattern);
          if (linkedinMatch) personInfo.linkedinUrl = `https://linkedin.com/in/${linkedinMatch[1]}`;
        }
        
        // Extract location
        if (!personInfo.location) {
          const locationPattern = /(?:based in|located in|from)\s+([A-Za-z\s,]+)/i;
          const locationMatch = result.content.match(locationPattern);
          if (locationMatch) personInfo.location = locationMatch[1].trim();
        }
      }
      
      return personInfo;
    } catch (error) {
      this.logger.error('Error parsing person info:', error);
      return { name, title, company };
    }
  }

  private normalizeTitle(title: string): string {
    const titleMap = {
      'CEO': 'Chief Executive Officer',
      'CTO': 'Chief Technology Officer',
      'CMO': 'Chief Marketing Officer',
      'VP': 'Vice President',
    };
    
    for (const [abbr, full] of Object.entries(titleMap)) {
      if (title.toUpperCase().includes(abbr)) {
        return title.replace(new RegExp(abbr, 'i'), full);
      }
    }
    
    return title;
  }
}
```

Create src/agents/outreach-list-agents/index.ts:
```typescript
export * from './event-discovery.agent';
export * from './sponsor-extraction.agent';
export * from './people-enricher.agent';
```

### Phase 6: Update Module Imports

Update src/agents/agents.module.ts:
```typescript
import { Module } from '@nestjs/common';
import { AgentModule } from '@/agent/agent.module';
import { PromptsModule } from '@/prompts/prompts.module';
import { EventDiscoveryAgent } from './outreach-list-agents/event-discovery.agent';
import { SponsorExtractionAgent } from './outreach-list-agents/sponsor-extraction.agent';
import { PeopleEnricherAgent } from './outreach-list-agents/people-enricher.agent';
// Keep existing example agents
import { CompanyEnrichmentAgent } from './company-enrichment.agent.ts.example';
import { EventDiscoveryExampleAgent } from './event-discovery.agent.ts.example';

@Module({
  imports: [AgentModule, PromptsModule],
  providers: [
    EventDiscoveryAgent,
    SponsorExtractionAgent,
    PeopleEnricherAgent,
    // Keep example agents for reference
    CompanyEnrichmentAgent,
    EventDiscoveryExampleAgent,
  ],
  exports: [
    EventDiscoveryAgent,
    SponsorExtractionAgent,
    PeopleEnricherAgent,
  ],
})
export class AgentsModule {}
```

### Phase 7: Create Prompt Seed Data

Create src/prompts/data/agent-prompts.seed.ts (full content from lumif.ai/backend)

### Phase 8: Database Migration

Create migration src/migrations/1754000000000-SeedAgentPrompts.ts:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';
import { agentPrompts } from '../prompts/data/agent-prompts.seed';

export class SeedAgentPrompts1754000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert prompts
    for (const promptData of agentPrompts) {
      const promptId = await queryRunner.query(
        `INSERT INTO prompt (key, name, description, namespace, type, variables, is_archived) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [
          promptData.key,
          promptData.name,
          promptData.description,
          promptData.agentNamespace,
          promptData.promptType,
          JSON.stringify(promptData.variables || []),
          false
        ]
      );

      // Create initial version
      await queryRunner.query(
        `INSERT INTO prompt_version (prompt_id, version, body, status, changelog) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          promptId[0].id,
          1,
          promptData.body,
          'published',
          'Initial version'
        ]
      );

      // Add tags
      if (promptData.tags && promptData.tags.length > 0) {
        for (const tag of promptData.tags) {
          await queryRunner.query(
            `INSERT INTO prompt_tag (prompt_id, name) VALUES ($1, $2)`,
            [promptId[0].id, tag]
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded prompts
    for (const promptData of agentPrompts) {
      await queryRunner.query(`DELETE FROM prompt WHERE key = $1`, [promptData.key]);
    }
  }
}
```

Run migration:
```bash
npm run migration:run
```

### Phase 9: Testing Instructions

1. **Test BAML Generation**
   ```bash
   npx baml generate
   # Should create files in src/agent/baml_client/
   ```

2. **Test Agent Discovery**
   ```bash
   npm run start:dev
   # Check logs for "Discovered agents: event-discovery, sponsor-extraction, people-enricher"
   ```

3. **Test via API**
   ```bash
   # List agents
   curl http://localhost:3000/api/agents

   # Execute event discovery
   curl -X POST http://localhost:3000/api/agents/execute \
     -H "Content-Type: application/json" \
     -d '{
       "agentId": "event-discovery",
       "methodName": "searchEvents",
       "parameters": {
         "location": "United States",
         "city": "San Francisco",
         "year": 2024,
         "topic": "technology"
       }
     }'
   ```

4. **Test WebSocket Progress**
   ```javascript
   // Connect to WebSocket
   const socket = io('http://localhost:3000/agent-execution');
   
   socket.on('progress', (data) => {
     console.log('Progress:', data);
   });
   
   socket.emit('execute', {
     agentId: 'event-discovery',
     methodName: 'searchEvents',
     parameters: { /* ... */ }
   });
   ```

### Phase 10: Validation Checklist

- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] BAML files created and generated
- [ ] Agents registered and discoverable
- [ ] Prompts seeded in database
- [ ] API endpoints working
- [ ] WebSocket progress reporting
- [ ] No conflicts with existing code

## Rollback Instructions

If issues arise:

1. **Remove BAML files**
   ```bash
   rm -rf src/agent/baml_src src/agent/baml_client
   ```

2. **Revert migration**
   ```bash
   npm run migration:revert
   ```

3. **Remove new agents**
   ```bash
   rm -rf src/agents/outreach-list-agents
   ```

4. **Restore package.json**
   ```bash
   git checkout package.json package-lock.json
   ```

5. **Restart services**
   ```bash
   npm run start:dev
   ```

## Success Criteria

The merge is successful when:
1. All new agents appear in `/api/agents` endpoint
2. Agent methods can be executed via API
3. WebSocket progress updates work
4. No existing functionality is broken
5. All tests pass

## Notes for Implementing Agent

- Follow the exact directory structure
- Copy code snippets exactly as provided
- Run commands in the order specified
- Test each phase before proceeding
- Keep backups of modified files
- Monitor logs for errors during implementation
- Once everything is working remove any temp files and backup filed created

This comprehensive guide provides everything needed to successfully merge the advanced AI capabilities from lumif.ai/backend into the events-outreach-backend system.