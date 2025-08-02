import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AgentRegistryService } from '../services/agent-registry.service';
import { AgentExecutionService } from '../services/agent-execution.service';
import { ExecuteAgentDto } from '../dto/execute-agent.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/enums/permission.enum';

@ApiTags('agents')
@ApiBearerAuth()
@Controller('agents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

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

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiParam({ name: 'executionId', type: 'string' })
  @RequirePermissions(Permission.AGENTS_READ)
  async getExecution(@Param('executionId') executionId: string) {
    try {
      const execution = await this.agentExecution.getExecution(executionId);

      if (!execution) {
        throw new HttpException(
          `Execution ${executionId} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return { execution };
    } catch (error) {
      this.logger.error(`Error getting execution ${executionId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to get execution details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('executions/:executionId')
  @ApiOperation({ summary: 'Cancel a running agent execution' })
  @ApiParam({ name: 'executionId', type: 'string' })
  @RequirePermissions(Permission.AGENTS_EXECUTE)
  async cancelExecution(@Param('executionId') executionId: string) {
    try {
      const result = await this.agentExecution.cancelExecution(executionId);

      if (!result) {
        throw new HttpException(
          `Execution ${executionId} not found or already completed`,
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        executionId,
        status: 'cancelled',
        message: 'Execution cancelled successfully',
      };
    } catch (error) {
      this.logger.error(`Error cancelling execution ${executionId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to cancel execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
