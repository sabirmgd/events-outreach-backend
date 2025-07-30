import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Logger,  
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TestPromptService, TestPromptResult } from '../services/test-prompt.service';

interface ExecuteTestPromptDto {
  prompt: string;
  variables?: Record<string, any>;
}

interface DetectVariablesDto {
  prompt: string;
}

@ApiTags('test-prompt')
@Controller('test-prompt')
export class TestPromptController {
  private readonly logger = new Logger(TestPromptController.name);

  constructor(private readonly testPromptService: TestPromptService) {}

  @Post('execute')
  @ApiOperation({ summary: 'Execute a test prompt with variables' })
  @ApiBody({
    description: 'Test prompt execution request',
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt template to execute',
          example: 'Search for {{topic}} events in {{location}} for {{year}}',
        },
        variables: {
          type: 'object',
          description: 'Variables to substitute in the prompt',
          example: {
            topic: 'technology',
            location: 'San Francisco',
            year: '2024',
          },
        },
      },
      required: ['prompt'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Test prompt executed successfully',
    schema: {
      type: 'object',
      properties: {
        output: {
          type: 'string',
          description: 'The generated response',
        },
        metrics: {
          type: 'object',
          properties: {
            executionTime: { type: 'number' },
            inputTokens: { type: 'number' },
            outputTokens: { type: 'number' },
            totalTokens: { type: 'number' },
            cost: { type: 'number' },
            model: { type: 'string' },
          },
        },
      },
    },
  })
  async executeTestPrompt(@Body() dto: ExecuteTestPromptDto) {
    try {
      const { prompt, variables = {} } = dto;
      
      if (!prompt || typeof prompt !== 'string') {
        throw new HttpException(
          'Prompt is required and must be a string',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`Executing test prompt with ${Object.keys(variables).length} variables`);
      
      const result = await this.testPromptService.executeTestPrompt(
        prompt,
        variables,
      );

      if (result.error) {
        throw new HttpException(
          result.error,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Error in executeTestPrompt:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to execute test prompt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('detect-variables')
  @ApiOperation({ summary: 'Detect variables in a prompt template' })
  @ApiBody({
    description: 'Prompt to analyze for variables',
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt template to analyze',
          example: 'Search for {{topic}} events in {{location}} for {{year}}',
        },
      },
      required: ['prompt'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Variables detected successfully',
    schema: {
      type: 'object',
      properties: {
        variables: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of detected variable names',
          example: ['topic', 'location', 'year'],
        },
      },
    },
  })
  async detectVariables(@Body() dto: DetectVariablesDto) {
    try {
      const { prompt } = dto;
      
      if (!prompt || typeof prompt !== 'string') {
        throw new HttpException(
          'Prompt is required and must be a string',
          HttpStatus.BAD_REQUEST,
        );
      }

      const variables = this.testPromptService.detectVariables(prompt);
      
      return { variables };
    } catch (error) {
      this.logger.error('Error in detectVariables:', error);
      
      throw new HttpException(
        'Failed to detect variables',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}