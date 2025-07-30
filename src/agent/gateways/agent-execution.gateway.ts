import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
// import { OnEvent } from '@nestjs/event-emitter'; // Not used currently
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AgentExecutionService } from '../services/agent-execution.service';
import { AgentRegistryService } from '../services/agent-registry.service';
import {
  AgentExecutionProgress,
  AgentExecutionResult,
} from '../types/agent.types';

interface ExecuteAgentPayload {
  agentId: string;
  methodName: string;
  params: any;
  executionId?: string;
}

@WebSocketGateway({
  namespace: '/agent-execution',
  cors: {
    origin: '*',
  },
})
export class AgentExecutionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AgentExecutionGateway.name);

  @WebSocketServer()
  server: Server;

  private clientExecutions = new Map<string, Set<string>>(); // clientId -> Set of executionIds
  private executionClients = new Map<string, Set<string>>(); // executionId -> Set of clientIds

  constructor(
    private readonly agentExecutionService: AgentExecutionService,
    private readonly agentRegistryService: AgentRegistryService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(
      `Client connected to agent execution gateway: ${client.id}`,
    );
    this.clientExecutions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `Client disconnected from agent execution gateway: ${client.id}`,
    );

    // Clean up client tracking
    const executions = this.clientExecutions.get(client.id);
    if (executions) {
      executions.forEach((executionId) => {
        const clients = this.executionClients.get(executionId);
        if (clients) {
          clients.delete(client.id);
          if (clients.size === 0) {
            this.executionClients.delete(executionId);
          }
        }
      });
    }
    this.clientExecutions.delete(client.id);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('startAgentExecution')
  async handleStartAgentExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ExecuteAgentPayload,
  ) {
    const { agentId, methodName, params, executionId } = payload;

    try {
      // Validate agent exists
      const agent = this.agentRegistryService.getAgent(agentId);
      if (!agent) {
        client.emit('executionError', {
          error: `Agent '${agentId}' not found`,
        });
        return;
      }

      // Validate method exists
      const method = this.agentRegistryService.getAgentMethod(
        agentId,
        methodName,
      );
      if (!method) {
        client.emit('executionError', {
          error: `Method '${methodName}' not found on agent '${agentId}'`,
        });
        return;
      }

      // Create execution context if not provided
      const execId =
        executionId ||
        this.agentExecutionService.createExecutionContext(
          agentId,
          methodName,
          client.data?.user,
        ).executionId;

      // Track client-execution relationship
      this.clientExecutions.get(client.id)?.add(execId);
      if (!this.executionClients.has(execId)) {
        this.executionClients.set(execId, new Set());
      }
      this.executionClients.get(execId)?.add(client.id);

      // Join execution room
      client.join(`execution:${execId}`);

      // Send confirmation
      client.emit('executionStarted', {
        executionId: execId,
        agentId,
        methodName,
      });

      // Execute agent method asynchronously
      this.agentExecutionService
        .executeWithProgress(
          agentId,
          methodName,
          params,
          execId,
          client.data?.user,
        )
        .then((result) => {
          // Result will be emitted via event listeners
        })
        .catch((error) => {
          // Error will be emitted via event listeners
        });
    } catch (error) {
      client.emit('executionError', {
        error: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('cancelAgentExecution')
  async handleCancelAgentExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string },
  ) {
    try {
      await this.agentExecutionService.cancelExecution(data.executionId);
      client.emit('executionCancelled', {
        executionId: data.executionId,
      });
    } catch (error) {
      client.emit('executionError', {
        executionId: data.executionId,
        error: error.message,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('getActiveExecutions')
  async handleGetActiveExecutions(@ConnectedSocket() client: Socket) {
    const executions = this.agentExecutionService.getActiveExecutions();
    client.emit('activeExecutions', executions);
  }

  // Event listeners for broadcasting updates
  // @OnEvent('agent.execution.progress')
  // handleAgentProgress(progress: AgentExecutionProgress) {
  //   this.server
  //     .to(`execution:${progress.executionId}`)
  //     .emit('agentProgress', progress);
  // }

  // @OnEvent('agent.execution.completed')
  // handleAgentCompleted(result: AgentExecutionResult) {
  //   this.server
  //     .to(`execution:${result.executionId}`)
  //     .emit('agentCompleted', result);
  // 
  //   // Clean up tracking
  //   this.cleanupExecution(result.executionId);
  // }

  // @OnEvent('agent.execution.failed')
  // handleAgentFailed(result: AgentExecutionResult) {
  //   this.server
  //     .to(`execution:${result.executionId}`)
  //     .emit('agentFailed', result);
  // 
  //   // Clean up tracking
  //   this.cleanupExecution(result.executionId);
  // }

  // @OnEvent('agent.execution.cancelled')
  // handleAgentCancelled(data: any) {
  //   this.server
  //     .to(`execution:${data.executionId}`)
  //     .emit('agentCancelled', data);
  // 
  //   // Clean up tracking
  //   this.cleanupExecution(data.executionId);
  // }

  // @OnEvent('agent.execution.status')
  // handleAgentStatus(data: any) {
  //   this.server.to(`execution:${data.executionId}`).emit('agentStatus', data);
  // }

  private cleanupExecution(executionId: string) {
    const clients = this.executionClients.get(executionId);
    if (clients) {
      clients.forEach((clientId) => {
        this.clientExecutions.get(clientId)?.delete(executionId);
      });
      this.executionClients.delete(executionId);
    }
  }
}
