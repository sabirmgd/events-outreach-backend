import { Module, Global } from '@nestjs/common';
import { AgentRegistryService } from './services/agent-registry.service';
import { AgentExecutionService } from './services/agent-execution.service';
import { TestPromptService } from './services/test-prompt.service';
import { AgentsController } from './controllers/agents.controller';
import { TestPromptController } from './controllers/test-prompt.controller';
import { AgentExecutionGateway } from './gateways/agent-execution.gateway';
import { AuthModule } from '@/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [AgentsController, TestPromptController],
  providers: [
    AgentRegistryService,
    AgentExecutionService,
    TestPromptService,
    AgentExecutionGateway,
  ],
  exports: [
    AgentRegistryService,
    AgentExecutionService,
    TestPromptService,
    AgentExecutionGateway,
  ],
})
export class AgentModule {}
