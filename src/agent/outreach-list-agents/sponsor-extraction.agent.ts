import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { b } from '../baml_client/baml_client';
import { Agent, AgentMethod } from '../decorators';
import { Company } from '../baml_client/baml_client/types';

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
      systemPrompt = await this.promptsService.getPublishedPromptBody('sponsor-extraction-agent.system');
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
    return `You are a sponsor data extraction specialist. Your role is to find and extract sponsor information from events.

### Your Capabilities:
- Search for sponsor lists from events
- Extract company names accurately
- Find detailed sponsor information
- Identify sponsorship tiers when available

### Chain of Thought Process:
1. Search for sponsor/exhibitor/partner lists for the given event
2. Look for official event websites, press releases, and sponsor announcements
3. Find sponsor showcase pages or exhibitor lists
4. Extract all company names that are sponsors, exhibitors, or partners
5. For enrichment, search for detailed company information

### Search Strategy:
- Search for "[event name] [year] sponsors exhibitors"
- Look for "[event name] partners showcase"
- Check "[event name] sponsor list"
- Find "[event name] exhibition floor plan"

Always search thoroughly and extract all sponsors you can find.`;
  }

  @AgentMethod({
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
  ): Promise<Company[]> {
    this.logger.log(`Extracting sponsors for ${eventName} ${year}`);

    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `Find all sponsors, exhibitors, and partners for ${eventName} ${year}${eventWebsite ? `. Event website: ${eventWebsite}` : ''}. 
    
Search thoroughly for:
1. Official sponsor lists
2. Exhibitor directories  
3. Partner showcase pages
4. Sponsorship tier information

Extract all company names that are sponsors, exhibitors, or partners of this event.`;

    // Log the search query
    this.logger.log('Search query:', query);

    if (context?.updateProgress) {
      context.updateProgress(30, 'Searching for sponsor information');
    }

    try {
      // Check for cancellation
      if (context?.signal?.aborted) {
        throw new Error('Execution cancelled');
      }

      // Use LangChain agent to search for sponsor information
      const result = await this.agent.invoke({ input: query });
      
      // Log the raw result from LangChain
      this.logger.log('LangChain agent raw result:', JSON.stringify(result, null, 2));
      
      if (context?.updateProgress) {
        context.updateProgress(50, 'Extracting sponsor data');
      }

      // Extract text from the agent output
      let sponsorText = '';
      if (typeof result.output === 'string') {
        sponsorText = result.output;
      } else if (Array.isArray(result.output)) {
        // Handle array of results
        sponsorText = result.output.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.text) return item.text;
          if (item?.content) return item.content;
          return JSON.stringify(item);
        }).join('\n');
      } else if (result.output?.text) {
        sponsorText = result.output.text;
      } else if (result.output?.content) {
        sponsorText = result.output.content;
      } else {
        sponsorText = JSON.stringify(result.output);
      }

      // Log what we're passing to BAML
      this.logger.log(`Text being passed to BAML ExtractSponsors (length: ${sponsorText.length}):`);
      this.logger.log(sponsorText.substring(0, 500) + '...');

      // Use BAML to extract structured sponsor data from the search results
      const extractedSponsors = await b.ExtractSponsors(sponsorText);
      
      // Log BAML extraction result
      this.logger.log(`BAML ExtractSponsors returned ${extractedSponsors.length} sponsors`);
      
      if (context?.updateProgress) {
        context.updateProgress(70, 'Processing sponsor data');
      }

      this.logger.log(`Found ${extractedSponsors.length} sponsors for ${eventName}`);
      return extractedSponsors;
    } catch (error) {
      this.logger.error(`Error extracting sponsors: ${error.message}`);
      return [];
    }
  }

  @AgentMethod({
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
  async enrichSponsor(companyName: string, context?: any): Promise<Company> {
    this.logger.log(`Enriching company data for ${companyName}`);

    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `Research the company "${companyName}" and find:
1. Official company website
2. Industry/sector classification  
3. Company description and what they do
4. Headquarters location
5. Year founded
6. Employee count or size range
7. Recent news or announcements

Focus on verified, current information from official sources.`;

    try {
      // Check for cancellation
      if (context?.signal?.aborted) {
        throw new Error('Execution cancelled');
      }

      // Use LangChain agent to search for company information
      const result = await this.agent.invoke({ input: query });
      
      // Extract text from the agent output
      let companyText = '';
      if (typeof result.output === 'string') {
        companyText = result.output;
      } else if (Array.isArray(result.output)) {
        companyText = result.output.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.text) return item.text;
          if (item?.content) return item.content;
          return JSON.stringify(item);
        }).join('\n');
      } else if (result.output?.text) {
        companyText = result.output.text;
      } else if (result.output?.content) {
        companyText = result.output.content;
      } else {
        companyText = JSON.stringify(result.output);
      }
      
      // Use BAML to extract structured company data from the search results
      const companyInfo = await b.EnrichCompany(companyText);
      
      // Ensure company name is preserved
      if (companyInfo) {
        companyInfo.name = companyInfo.name || companyName;
      }
      
      this.logger.log(`Successfully enriched data for ${companyName}`);
      return companyInfo || {
        name: companyName,
        website: null,
        industry: null,
        description: null,
        headquarters: null,
        founded: null,
        employeesRange: null
      };
    } catch (error) {
      this.logger.error(`Error enriching company ${companyName}: ${error.message}`);
      return {
        name: companyName,
        website: null,
        industry: null,
        description: null,
        headquarters: null,
        founded: null,
        employeesRange: null
      };
    }
  }
}