import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchTool } from '../tools/tavily-search.tool';
import { PromptsService } from '../../prompts/services/prompts.service';
import { b } from '../baml_client/baml_client';
import { Agent, AgentMethod } from '../decorators';
import { Person } from '../baml_client/baml_client/types';

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
      systemPrompt = await this.promptsService.getPublishedPromptBody('people-enricher.system');
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
    return `You are a people data enrichment specialist. Find missing contact information and professional details.

### Primary Focus - Key Decision Makers:
- CEO (Chief Executive Officer)
- CTO (Chief Technology Officer)
- CMO (Chief Marketing Officer)
- VP/Head of Sales
- VP/Head of Marketing
- Director level positions in relevant departments

### Search Strategy:
1. Start with company leadership pages and "about us" sections
2. Check recent press releases and announcements
3. Look for conference speaker profiles
4. Search professional networks and company directories
5. Find LinkedIn profiles and professional bios

### Data Points to Extract:
- Full name (with proper capitalization)
- Current job title
- Company affiliation
- Email address (professional preferred)
- LinkedIn profile URL
- Location (city, country)
- Professional bio or expertise areas

Always verify information accuracy and prioritize recent data.`;
  }

  @AgentMethod({
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
      },
      {
        name: 'targetFunctions',
        type: 'array',
        description: 'Target job functions/roles to search for',
        required: false
      }
    ]
  })
  async findCompanyPOCs(
    companyName: string, 
    companyWebsite: string, 
    industry: string,
    targetFunctions?: string[],
    context?: any
  ): Promise<Person[]> {
    this.logger.log(`Finding POCs at ${companyName} with target functions: ${targetFunctions?.join(', ') || 'default roles'}`);

    if (!this.agent) {
      await this.initializeAgent();
    }

    // Use provided target functions or default to common executive roles
    const rolesToSearch = targetFunctions && targetFunctions.length > 0 
      ? targetFunctions 
      : ['CEO', 'CTO', 'CMO', 'CFO', 'VP Sales', 'VP Marketing', 'VP Business Development', 'Director of Partnerships'];

    const query = `Find specific decision makers at ${companyName}${industry ? ` (${industry} industry)` : ''}.
    
Search ONLY for people with these specific roles/titles:
${rolesToSearch.map((role, index) => `${index + 1}. ${role}`).join('\n')}

IMPORTANT: Only return people who have one of these exact roles. Do not include other executives or employees.

${companyWebsite ? `Check the company website: ${companyWebsite}` : ''}

For each person found, extract their full name, title, email, LinkedIn profile, and location.`;

    if (context?.updateProgress) {
      context.updateProgress(30, 'Searching for company contacts');
    }

    try {
      // Check for cancellation
      if (context?.signal?.aborted) {
        throw new Error('Execution cancelled');
      }

      // Use LangChain agent to search for people
      const result = await this.agent.invoke({ input: query });
      
      if (context?.updateProgress) {
        context.updateProgress(50, 'Extracting contact data');
      }

      // Extract text from the agent output
      let peopleText = '';
      if (typeof result.output === 'string') {
        peopleText = result.output;
      } else if (Array.isArray(result.output)) {
        peopleText = result.output.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.text) return item.text;
          if (item?.content) return item.content;
          return JSON.stringify(item);
        }).join('\n');
      } else if (result.output?.text) {
        peopleText = result.output.text;
      } else if (result.output?.content) {
        peopleText = result.output.content;
      } else {
        peopleText = JSON.stringify(result.output);
      }

      // Use BAML to extract structured person data from the search results
      let extractedPeople: Person[];
      try {
        // Try to use the new function with role filtering
        extractedPeople = await b.FindCompanyPOCsByRoles(peopleText, rolesToSearch);
      } catch (error) {
        // Fallback to the old function if new one is not available
        this.logger.warn('FindCompanyPOCsByRoles not available, using FindCompanyPOCs fallback');
        extractedPeople = await b.FindCompanyPOCs(peopleText);
        // Filter results to match target functions
        extractedPeople = extractedPeople.filter((person: Person) => 
          rolesToSearch.some((role: string) => 
            person.title?.toLowerCase().includes(role.toLowerCase()) ||
            person.role?.toLowerCase().includes(role.toLowerCase())
          )
        );
      }
      
      if (context?.updateProgress) {
        context.updateProgress(70, 'Processing contact data');
      }

      this.logger.log(`Found ${extractedPeople.length} contacts at ${companyName} matching roles: ${rolesToSearch.join(', ')}`);
      return extractedPeople;
    } catch (error) {
      this.logger.error(`Error finding POCs: ${error.message}`);
      return [];
    }
  }

  @AgentMethod({
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
    company: string, 
    title: string,
    context?: any
  ): Promise<Person> {
    this.logger.log(`Enriching contact data for ${name}`);

    if (!this.agent) {
      await this.initializeAgent();
    }

    const query = `Research ${name}${company ? ` from ${company}` : ''}${title ? ` (${title})` : ''}.

Find and extract:
1. Full name with proper capitalization
2. Current job title and company
3. Professional email address  
4. LinkedIn profile URL
5. Location (city, country)
6. Professional biography
7. Areas of expertise
8. Recent speaking engagements or publications

Focus on verified, professional information from credible sources.`;

    try {
      // Check for cancellation
      if (context?.signal?.aborted) {
        throw new Error('Execution cancelled');
      }

      // Use LangChain agent to search for person information
      const result = await this.agent.invoke({ input: query });
      
      // Extract text from the agent output
      let personText = '';
      if (typeof result.output === 'string') {
        personText = result.output;
      } else if (Array.isArray(result.output)) {
        personText = result.output.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.text) return item.text;
          if (item?.content) return item.content;
          return JSON.stringify(item);
        }).join('\n');
      } else if (result.output?.text) {
        personText = result.output.text;
      } else if (result.output?.content) {
        personText = result.output.content;
      } else {
        personText = JSON.stringify(result.output);
      }
      
      // Use BAML to extract structured person data from the search results
      const personInfo = await b.EnrichPerson(personText);
      
      // Ensure required fields are preserved
      if (personInfo) {
        personInfo.name = personInfo.name || name;
        personInfo.company = personInfo.company || company || null;
        personInfo.title = personInfo.title || title || null;
      }
      
      this.logger.log(`Successfully enriched data for ${name}`);
      return personInfo || {
        name: name,
        title: title || null,
        company: company || null,
        email: null,
        phone: null,
        linkedinUrl: null,
        bio: null,
        location: null,
        expertise: null,
        sessionType: null,
        topic: null,
        role: null
      };
    } catch (error) {
      this.logger.error(`Error enriching person ${name}: ${error.message}`);
      return {
        name: name,
        title: title || null,
        company: company || null,
        email: null,
        phone: null,
        linkedinUrl: null,
        bio: null,
        location: null,
        expertise: null,
        sessionType: null,
        topic: null,
        role: null
      };
    }
  }
}