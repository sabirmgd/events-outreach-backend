import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PerplexityClient } from './perplexity.client';

@Module({
  imports: [HttpModule],
  providers: [PerplexityClient],
  exports: [PerplexityClient],
})
export class ClientsModule {}
