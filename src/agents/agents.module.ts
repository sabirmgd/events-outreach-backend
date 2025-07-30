import { Module } from '@nestjs/common';
// import { EventDiscoveryAgent } from './event-discovery.agent';
// import { CompanyEnrichmentAgent } from './company-enrichment.agent';
import { PromptsModule } from '@/prompts/prompts.module';
// import { EventModule } from '@/event/event.module';
// import { CompanyModule } from '@/company/company.module';
// import { ToolsModule } from '@/tools/tools.module';
// import { ClientsModule } from '@/clients/clients.module';

@Module({
  imports: [
    PromptsModule,
    // EventModule,
    // CompanyModule,
    // ToolsModule,
    // ClientsModule,
  ],
  providers: [
    // EventDiscoveryAgent, 
    // CompanyEnrichmentAgent
  ],
  exports: [
    // EventDiscoveryAgent, 
    // CompanyEnrichmentAgent
  ],
})
export class AgentsModule {}
