import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { PerplexityProvider } from './providers/perplexity.provider';
import { GoogleGeminiProvider } from './providers/google-gemini.provider';
import { ClientsModule } from '@clients/clients.module';

@Module({
  imports: [ClientsModule],
  providers: [ToolsService, PerplexityProvider, GoogleGeminiProvider],
  exports: [ToolsService],
})
export class ToolsModule {}
