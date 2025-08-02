import { Injectable, Logger } from '@nestjs/common';
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { Tool } from '@langchain/core/tools';

export interface TestPromptResult {
  output: string;
  metrics: {
    executionTime: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
    model: string;
  };
  error?: string;
}

@Injectable()
export class TestPromptService {
  private readonly logger = new Logger(TestPromptService.name);
  private agent: AgentExecutor;
  private model: ChatAnthropic;

  constructor() {
    this.initializeAgent();
  }

  private initializeAgent() {
    this.logger.log('[TestPromptService] Initializing agent...');

    if (!process.env.ANTHROPIC_API_KEY) {
      this.logger.warn(
        '[TestPromptService] ANTHROPIC_API_KEY not found. Test prompt functionality will be limited.',
      );
      return;
    }

    this.logger.debug('[TestPromptService] Creating ChatAnthropic model...');
    this.model = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0,
      maxTokens: 4096,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    const tools: Tool[] = [];

    if (process.env.TAVILY_API_KEY) {
      this.logger.debug('[TestPromptService] Adding Tavily search tool...');
      const tavilyTool = new TavilySearchResults({
        maxResults: 10,
        apiKey: process.env.TAVILY_API_KEY,
      });
      tools.push(tavilyTool);
      this.logger.log('[TestPromptService] Tavily search tool initialized');
    } else {
      this.logger.debug(
        '[TestPromptService] TAVILY_API_KEY not found, skipping search tool',
      );
    }

    this.logger.debug('[TestPromptService] Creating chat prompt template...');
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are a helpful AI assistant. Use the available tools to help answer questions and complete tasks. When using search tools, always return the complete raw results without summarizing or filtering them.',
      ],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);

    this.logger.debug('[TestPromptService] Creating tool calling agent...');
    const agent = createToolCallingAgent({
      llm: this.model,
      tools,
      prompt,
    });

    this.logger.debug('[TestPromptService] Creating agent executor...');
    this.agent = new AgentExecutor({
      agent,
      tools,
      returnIntermediateSteps: true,
      maxIterations: 10,
      handleParsingErrors: true,
    });

    this.logger.log(
      `[TestPromptService] Agent initialized successfully with ${tools.length} tools`,
    );
  }

  async executeTestPrompt(
    prompt: string,
    variables: Record<string, any> = {},
  ): Promise<TestPromptResult> {
    const startTime = Date.now();
    this.logger.log(`[TestPromptService] executeTestPrompt called`);
    this.logger.debug(
      `[TestPromptService] Input prompt length: ${prompt.length} characters`,
    );
    this.logger.debug(
      `[TestPromptService] Variables: ${JSON.stringify(variables)}`,
    );

    if (!this.agent || !this.model) {
      this.logger.error(
        '[TestPromptService] Agent or model not initialized - missing API key',
      );
      return {
        output: '',
        metrics: {
          executionTime: Date.now() - startTime,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          model: 'unavailable',
        },
        error:
          'ANTHROPIC_API_KEY not configured. Please set the API key to use test prompt functionality.',
      };
    }

    try {
      this.logger.debug('[TestPromptService] Interpolating variables...');
      const interpolatedPrompt = this.interpolateVariables(prompt, variables);
      this.logger.debug(
        `[TestPromptService] Interpolated prompt length: ${interpolatedPrompt.length} characters`,
      );
      this.logger.log(
        `[TestPromptService] Executing prompt: ${interpolatedPrompt.substring(0, 100)}...`,
      );

      this.logger.debug('[TestPromptService] Calling agent.invoke()...');
      const result = await this.agent.invoke({
        input: interpolatedPrompt,
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `[TestPromptService] Agent execution completed in ${executionTime}ms`,
      );
      this.logger.debug(
        `[TestPromptService] Raw result type: ${typeof result}`,
      );
      this.logger.debug(
        `[TestPromptService] Raw result keys: ${Object.keys(result || {}).join(', ')}`,
      );

      // Extract text from the output if it's an array of message parts
      this.logger.debug('[TestPromptService] Processing agent output...');
      let outputText = result.output;
      this.logger.debug(
        `[TestPromptService] Initial output type: ${typeof result.output}`,
      );

      if (Array.isArray(result.output) && result.output.length > 0) {
        this.logger.debug(
          `[TestPromptService] Output is array with ${result.output.length} items`,
        );
        outputText = result.output
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('\n');
        this.logger.debug(
          '[TestPromptService] Extracted text from array output',
        );
      }

      // If intermediate steps contain tool outputs, include them
      if (result.intermediateSteps && result.intermediateSteps.length > 0) {
        this.logger.debug(
          `[TestPromptService] Processing ${result.intermediateSteps.length} intermediate steps`,
        );
        const toolOutputs = result.intermediateSteps
          .filter((step: any) => step.observation)
          .map((step: any) => {
            if (typeof step.observation === 'string') {
              return step.observation;
            }
            return JSON.stringify(step.observation, null, 2);
          });

        if (toolOutputs.length > 0) {
          this.logger.log(
            `[TestPromptService] Found ${toolOutputs.length} tool outputs in intermediate steps`,
          );
          // Combine tool outputs with the final output
          outputText = [...toolOutputs, outputText].join('\n\n---\n\n');
        }
      } else {
        this.logger.debug('[TestPromptService] No intermediate steps found');
      }

      this.logger.debug(
        `[TestPromptService] Final output length: ${outputText?.length || 0} characters`,
      );

      this.logger.debug('[TestPromptService] Calculating metrics...');
      const metrics = await this.calculateMetrics(
        interpolatedPrompt,
        outputText,
        executionTime,
      );
      this.logger.debug(
        `[TestPromptService] Metrics calculated: ${JSON.stringify(metrics)}`,
      );

      this.logger.log(
        '[TestPromptService] Execution successful, returning result',
      );
      return {
        output: outputText,
        metrics,
      };
    } catch (error) {
      this.logger.error(
        '[TestPromptService] Error executing test prompt:',
        error,
      );
      this.logger.error(
        '[TestPromptService] Error stack:',
        error instanceof Error ? error.stack : 'No stack trace',
      );

      return {
        output: '',
        metrics: {
          executionTime: Date.now() - startTime,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          model: this.model?.modelName || 'unavailable',
        },
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private interpolateVariables(
    prompt: string,
    variables: Record<string, any>,
  ): string {
    let interpolated = prompt;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      interpolated = interpolated.replace(regex, String(value));
    });

    return interpolated;
  }

  private async calculateMetrics(
    input: string,
    output: string,
    executionTime: number,
  ) {
    const inputTokens = this.estimateTokens(input);
    const outputTokens = this.estimateTokens(output);
    const totalTokens = inputTokens + outputTokens;

    // Claude 3.5 Sonnet pricing (as of 2024)
    const costPerInputToken = 0.003 / 1000; // $0.003 per 1K input tokens
    const costPerOutputToken = 0.015 / 1000; // $0.015 per 1K output tokens
    const cost =
      inputTokens * costPerInputToken + outputTokens * costPerOutputToken;

    return {
      executionTime,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      model: this.model?.modelName || 'unavailable',
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  detectVariables(prompt: string): string[] {
    this.logger.debug(
      `[TestPromptService] detectVariables called with prompt length: ${prompt.length}`,
    );
    const variablePattern = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
    const variables = new Set<string>();

    let match;
    while ((match = variablePattern.exec(prompt)) !== null) {
      variables.add(match[1]);
      this.logger.debug(`[TestPromptService] Found variable: ${match[1]}`);
    }

    const result = Array.from(variables);
    this.logger.debug(
      `[TestPromptService] Detected ${result.length} variables: [${result.join(', ')}]`,
    );
    return result;
  }
}
