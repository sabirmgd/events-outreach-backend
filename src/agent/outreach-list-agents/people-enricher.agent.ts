import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { Agent, AgentMethod } from '../decorators';

@Agent({
  id: 'people-enricher',
  name: 'People Enricher Agent',
  description: 'Enriches person and contact information',
  category: 'enrichment',
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
      systemPrompt = await this.promptsService.getPublishedPromptBody(
        'people-enricher.system',
      );
    } catch (error) {
      systemPrompt =
        'You are a people data enrichment specialist. Find missing contact information and professional details. For POCs, focus on key decision makers: CEO, CTO, CMO, Sales Head, Marketing Head. Only fill null fields, never overwrite existing data.';
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });
    this.agent = new AgentExecutor({ agent, tools });
  }

  @AgentMethod({
    description: 'Find key decision makers at a company',
    parameters: [
      {
        name: 'companyName',
        type: 'string',
        description: 'Company name',
        required: true,
      },
      {
        name: 'companyWebsite',
        type: 'string',
        description: 'Company website',
        required: false,
      },
      {
        name: 'industry',
        type: 'string',
        description: 'Company industry',
        required: false,
      },
    ],
  })
  async findCompanyPOCs(
    companyName: string,
    companyWebsite?: string,
    industry?: string,
    context?: any,
  ): Promise<any[]> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `${companyName} ${industry || ''} CEO CTO CMO "head of sales" "VP marketing" leadership team executives contact information`;

    if (context?.updateProgress) {
      context.updateProgress(30, 'Searching for company leadership');
    }

    // Check for cancellation
    if (context?.signal?.aborted) {
      throw new Error('Execution cancelled');
    }

    const result = await this.agent.invoke({ input: query });

    if (context?.updateProgress) {
      context.updateProgress(70, 'Processing contact information');
    }

    return this.parsePOCs(result.output, companyName);
  }

  @AgentMethod({
    description: 'Enrich person contact information',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Person name',
        required: true,
      },
      {
        name: 'company',
        type: 'string',
        description: 'Person company',
        required: false,
      },
      {
        name: 'title',
        type: 'string',
        description: 'Person title',
        required: false,
      },
    ],
  })
  async enrichPerson(
    name: string,
    company?: string,
    title?: string,
    context?: any,
  ): Promise<any> {
    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `${name} ${company || ''} ${title || ''} email LinkedIn contact`;

    // Check for cancellation
    if (context?.signal?.aborted) {
      throw new Error('Execution cancelled');
    }

    const result = await this.agent.invoke({ input: query });

    return this.parsePersonInfo(result.output, name, company, title);
  }

  private parsePOCs(output: any, companyName: string): any[] {
    const pocs: any[] = [];

    try {
      const data = JSON.parse(output);

      // Common C-suite titles to look for
      const targetTitles = [
        'CEO',
        'CTO',
        'CMO',
        'VP Sales',
        'VP Marketing',
        'Head of Sales',
        'Head of Marketing',
      ];

      for (const result of data.results || []) {
        // Extract names with titles
        const namePattern =
          /([A-Z][a-z]+ [A-Z][a-z]+)\s*,?\s*(CEO|CTO|CMO|VP|Head of|Director)/gi;
        const matches = result.content.matchAll(namePattern);

        for (const match of matches) {
          const name = match[1];
          const title = match[2];

          if (!pocs.find((p) => p.name === name)) {
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

  private parsePersonInfo(
    output: any,
    name: string,
    company?: string,
    title?: string,
  ): any {
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
      } as any;

      for (const result of data.results || []) {
        // Extract email
        if (!personInfo.email) {
          const emailPattern =
            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
          const emailMatch = result.content.match(emailPattern);
          if (emailMatch) personInfo.email = emailMatch[1];
        }

        // Extract LinkedIn
        if (!personInfo.linkedinUrl) {
          const linkedinPattern = /linkedin\.com\/in\/([a-zA-Z0-9-]+)/;
          const linkedinMatch = result.content.match(linkedinPattern);
          if (linkedinMatch)
            personInfo.linkedinUrl = `https://linkedin.com/in/${linkedinMatch[1]}`;
        }

        // Extract location
        if (!personInfo.location) {
          const locationPattern =
            /(?:based in|located in|from)\s+([A-Za-z\s,]+)/i;
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
      CEO: 'Chief Executive Officer',
      CTO: 'Chief Technology Officer',
      CMO: 'Chief Marketing Officer',
      VP: 'Vice President',
    };

    for (const [abbr, full] of Object.entries(titleMap)) {
      if (title.toUpperCase().includes(abbr)) {
        return title.replace(new RegExp(abbr, 'i'), full);
      }
    }

    return title;
  }
}
