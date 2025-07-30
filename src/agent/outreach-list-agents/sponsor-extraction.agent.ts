import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { Agent, AgentMethod } from '../decorators';

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
    this.agent = new AgentExecutor({ agent, tools });
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
  ): Promise<any> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `${eventName} ${year} sponsors exhibitors partners companies`;
    
    if (context?.updateProgress) {
      context.updateProgress(30, 'Searching for sponsor information');
    }

    // Check for cancellation
    if (context?.signal?.aborted) {
      throw new Error('Execution cancelled');
    }
    
    const result = await this.agent.invoke({ input: query });
    
    if (context?.updateProgress) {
      context.updateProgress(70, 'Processing sponsor data');
    }

    return this.parseSponsors(result.output);
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
  async enrichSponsor(companyName: string, context?: any): Promise<any> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `${companyName} company website industry headquarters employees founded`;
    
    // Check for cancellation
    if (context?.signal?.aborted) {
      throw new Error('Execution cancelled');
    }
    
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
        data.results.forEach((result: any) => {
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