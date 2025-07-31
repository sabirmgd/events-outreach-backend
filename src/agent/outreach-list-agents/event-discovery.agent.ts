import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { Agent, AgentMethod } from '../decorators';
import { b } from '../baml_client/baml_client';
import { EventWithDetails } from '../baml_client/baml_client/types';

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
      maxIterations: 5,
    });
  }

  private async getDefaultSystemPrompt(): Promise<string> {
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
    description: 'Search for events in a specific location and year',
    parameters: [
      {
        name: 'location',
        type: 'string',
        description: 'Country or region for the event search',
        required: true
      },
      {
        name: 'city',
        type: 'string',
        description: 'Specific city for the event search',
        required: false
      },
      {
        name: 'year',
        type: 'number',
        description: 'Year to search for events',
        required: true
      },
      {
        name: 'topic',
        type: 'string',
        description: 'Topic or industry focus',
        required: false,
        default: 'technology'
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

Extract comprehensive information about each event found.`;

    if (context?.updateProgress) {
      context.updateProgress(30, 'Searching with LangChain tools');
    }
    
    try {
      // Check for cancellation
      if (context?.signal?.aborted) {
        throw new Error('Execution cancelled');
      }
      
      // Step 1: Use LangChain agent to search for events
      const result = await this.agent.invoke({ input: searchInstruction });
      
      if (context?.updateProgress) {
        context.updateProgress(60, 'Extracting structured data with BAML');
      }

      // Step 2: Extract text from LangChain result
      let searchText = '';
      if (typeof result.output === 'string') {
        searchText = result.output;
      } else if (Array.isArray(result.output)) {
        searchText = result.output.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.text) return item.text;
          if (item?.content) return item.content;
          return JSON.stringify(item);
        }).join('\n');
      } else if (result.output?.text) {
        searchText = result.output.text;
      } else if (result.output?.content) {
        searchText = result.output.content;
      } else {
        searchText = JSON.stringify(result.output);
      }

      this.logger.log(`Search results length: ${searchText.length} characters`);

      // Step 3: Use BAML to extract structured event data from search results
      const eventsWithDetails: EventWithDetails[] = await b.ExtractEvents(searchText);
      
      if (context?.updateProgress) {
        context.updateProgress(90, 'Processing results');
      }

      this.logger.log(`Successfully extracted ${eventsWithDetails.length} events with details`);
      
      // Convert BAML EventWithDetails to simple event format for compatibility
      const events = eventsWithDetails.map(eventWithDetails => ({
        name: eventWithDetails.event.name,
        date: eventWithDetails.event.dates || `${year}`,
        location: `${eventWithDetails.event.city}, ${eventWithDetails.event.country || location}`,
        venue: eventWithDetails.event.venue,
        website: eventWithDetails.event.website,
        attendees: eventWithDetails.event.attendeeCount,
        industry: eventWithDetails.event.industry,
        description: eventWithDetails.event.description,
        organizer: eventWithDetails.event.organizer,
        type: eventWithDetails.event.type || 'conference',
        sponsors: eventWithDetails.sponsors?.map(s => s.company.name) || [],
        speakers: eventWithDetails.speakers?.map(s => s.name) || []
      }));

      return events;
    } catch (error) {
      this.logger.error(`Error in hybrid event search: ${error.message}`);
      // Return empty array instead of throwing to prevent execution failure
      return [];
    }
  }

  private parseAgentOutput(output: any): any[] {
    try {
      let outputText = output;
      
      // Handle different output formats
      if (typeof output === 'object' && output !== null) {
        if (output.text) {
          outputText = output.text;
        } else if (output.output) {
          outputText = output.output;
        } else {
          outputText = JSON.stringify(output);
        }
      }
      
      // Ensure outputText is a string
      if (typeof outputText !== 'string') {
        outputText = JSON.stringify(outputText);
      }
      
      // Try to extract JSON structure
      const jsonMatch = outputText.match(/\{[\s\S]*"reasoning"[\s\S]*"events"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        this.logger.log('Chain of thought reasoning:', parsed.reasoning);
        return parsed.events || [];
      }
      
      // Try direct JSON parse if no match found
      try {
        const parsed = JSON.parse(outputText);
        if (parsed.events) {
          this.logger.log('Direct parse - reasoning:', parsed.reasoning);
          return parsed.events;
        }
      } catch (e) {
        // Not valid JSON, continue
      }
      
      // Fallback: look for array pattern
      const arrayMatch = outputText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          return JSON.parse(arrayMatch[0]);
        } catch (e) {
          // Not valid array
        }
      }
      
      throw new Error('No valid event data found in output');
    } catch (error) {
      this.logger.error('Failed to parse agent output:', error);
      this.logger.error('Raw output:', output);
      return [];
    }
  }
}