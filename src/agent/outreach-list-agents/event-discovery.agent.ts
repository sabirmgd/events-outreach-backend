import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { Agent, AgentMethod } from '../decorators';

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

Extract structured data for each event found.`;

    if (context?.updateProgress) {
      context.updateProgress(30, 'Executing search with LangChain agent');
    }
    
    let result;
    let retries = 3;
    
    while (retries > 0) {
      // Check for cancellation
      if (context?.signal?.aborted) {
        throw new Error('Execution cancelled');
      }
      
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

    if (context?.updateProgress) {
      context.updateProgress(70, 'Parsing and structuring results');
    }
    
    return this.parseAgentOutput(result?.output || '[]');
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