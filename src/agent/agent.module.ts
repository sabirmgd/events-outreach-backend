import { Module, Global } from '@nestjs/common';
import { AgentRegistryService } from './services/agent-registry.service';
import { AgentExecutionService } from './services/agent-execution.service';
import { AgentsController } from './controllers/agents.controller';
import { AgentExecutionGateway } from './gateways/agent-execution.gateway';
import { AuthModule } from '@/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AgentsController],
  providers: [
    AgentRegistryService,
    AgentExecutionService,
    AgentExecutionGateway,
  ],
  exports: [AgentRegistryService, AgentExecutionService],
})
export class AgentModule {}
