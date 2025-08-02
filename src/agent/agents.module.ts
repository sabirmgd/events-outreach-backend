import { Module } from '@nestjs/common';
import { AgentModule } from '@/agent/agent.module';
import { PromptsModule } from '@/prompts/prompts.module';
import { EventDiscoveryAgent } from './outreach-list-agents/event-discovery.agent';
import { SponsorExtractionAgent } from './outreach-list-agents/sponsor-extraction.agent';
import { PeopleEnricherAgent } from './outreach-list-agents/people-enricher.agent';
// Keep existing example agents
// import { CompanyEnrichmentAgent } from './company-enrichment.agent.ts.example';
// import { EventDiscoveryAgent as EventDiscoveryExampleAgent } from './event-discovery.agent.ts.example';

@Module({
  imports: [AgentModule, PromptsModule],
  providers: [
    EventDiscoveryAgent,
    SponsorExtractionAgent,
    PeopleEnricherAgent,
    // Keep example agents for reference - commented out to avoid conflicts
    // CompanyEnrichmentAgent,
    // EventDiscoveryExampleAgent,
  ],
  exports: [EventDiscoveryAgent, SponsorExtractionAgent, PeopleEnricherAgent],
})
export class AgentsModule {}
