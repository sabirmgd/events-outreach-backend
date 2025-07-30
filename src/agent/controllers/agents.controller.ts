import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { AgentRegistryService } from '../services/agent-registry.service';
import { AgentExecutionService } from '../services/agent-execution.service';
import { ExecuteAgentDto } from '../dto/execute-agent.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/enums/permission.enum';

@Controller('agents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AgentsController {
  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly agentExecution: AgentExecutionService,
  ) {}

  @Get()
  @RequirePermissions(Permission.AGENTS_READ)
  getAllAgents() {
    return this.agentRegistry.getAllAgents();
  }

  @Get('category/:category')
  @RequirePermissions(Permission.AGENTS_READ)
  getAgentsByCategory(@Param('category') category: string) {
    return this.agentRegistry.getAgentsByCategory(category);
  }

  @Get('executions/active')
  @RequirePermissions(Permission.AGENTS_READ)
  getActiveExecutions() {
    return this.agentExecution.getActiveExecutions();
  }

  @Get(':agentId')
  @RequirePermissions(Permission.AGENTS_READ)
  getAgent(@Param('agentId') agentId: string) {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent '${agentId}' not found`);
    }
    return agent.definition;
  }

  @Get(':agentId/methods/:methodName')
  @RequirePermissions(Permission.AGENTS_READ)
  getAgentMethod(
    @Param('agentId') agentId: string,
    @Param('methodName') methodName: string,
  ) {
    const method = this.agentRegistry.getAgentMethod(agentId, methodName);
    if (!method) {
      throw new NotFoundException(
        `Method '${methodName}' not found on agent '${agentId}'`,
      );
    }
    return method;
  }

  @Post(':agentId/:methodName/validate')
  @RequirePermissions(Permission.AGENTS_READ)
  validateMethodParams(
    @Param('agentId') agentId: string,
    @Param('methodName') methodName: string,
    @Body() params: Record<string, any>,
  ) {
    return this.agentRegistry.validateMethodParams(agentId, methodName, params);
  }

  @Post(':agentId/:methodName/execute')
  @RequirePermissions(Permission.AGENTS_EXECUTE)
  async executeAgentMethod(
    @Param('agentId') agentId: string,
    @Param('methodName') methodName: string,
    @Body() dto: ExecuteAgentDto,
    @Request() req: Express.Request & { user?: any },
  ) {
    return await this.agentExecution.executeWithProgress(
      agentId,
      methodName,
      dto.params,
      dto.executionId,
      req.user,
    );
  }
}
