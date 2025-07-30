import { Injectable } from '@nestjs/common';
import { ToolProvider } from './enums/tool-provider.enum';
import { BaseToolProvider } from './providers/base.provider';
import { PerplexityProvider } from './providers/perplexity.provider';
import { GoogleGeminiProvider } from './providers/google-gemini.provider';

@Injectable()
export class ToolsService {
  private readonly providers: Map<ToolProvider, BaseToolProvider>;

  constructor(
    private readonly perplexityProvider: PerplexityProvider,
    private readonly googleGeminiProvider: GoogleGeminiProvider,
  ) {
    this.providers = new Map();
    this.providers.set(ToolProvider.PERPLEXITY, this.perplexityProvider);
    this.providers.set(ToolProvider.GOOGLE_GEMINI, this.googleGeminiProvider);
  }

  getProvider(provider: ToolProvider): BaseToolProvider {
    const p = this.providers.get(provider);
    if (!p) {
      throw new Error(`Provider ${provider} not found`);
    }
    return p;
  }
}
