import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
}

interface PerplexityResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

@Injectable()
export class PerplexityClient {
  private readonly logger = new Logger(PerplexityClient.name);
  private readonly apiUrl = 'https://api.perplexity.ai/chat/completions';
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const apiKey = this.configService.get<string>('PERPLEXITY_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Perplexity API key not found');
    }
    this.apiKey = apiKey;
  }

  async chatCompletion(
    promptTemplate: string,
    variables: Record<string, string>,
    model = 'sonar-pro',
  ): Promise<string> {
    const content = this.hydratePrompt(promptTemplate, variables);
    const payload: PerplexityRequest = {
      model,
      messages: [{ role: 'user', content }],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<PerplexityResponse>(this.apiUrl, payload, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const { data } = response;
      if (!data.choices || data.choices.length === 0) {
        throw new InternalServerErrorException('No response from Perplexity');
      }

      const choice = data.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new InternalServerErrorException(
          'Invalid response from Perplexity',
        );
      }
      return choice.message.content;
    } catch (error) {
      if (isAxiosError(error)) {
        this.logger.error('Error calling Perplexity API', error.response?.data);
      } else {
        this.logger.error('Error calling Perplexity API', error);
      }
      throw new InternalServerErrorException('Failed to call Perplexity API');
    }
  }

  private hydratePrompt(
    template: string,
    variables: Record<string, string>,
  ): string {
    return Object.entries(variables).reduce((acc, [key, value]) => {
      return acc.replace(new RegExp(`{${key}}`, 'g'), value);
    }, template);
  }
}
