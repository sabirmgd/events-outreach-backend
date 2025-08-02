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
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AgentExecutionService } from '../services/agent-execution.service';
import { AgentRegistryService } from '../services/agent-registry.service';
import { TestPromptService } from '../services/test-prompt.service';
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
    origin: ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
  },
})
export class AgentExecutionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AgentExecutionGateway.name);

  @WebSocketServer()
  server: Server;

  sendProgress(executionId: string, progress: any) {
    this.server?.emit(`execution:${executionId}:progress`, progress);
    // Also emit to namespace for backward compatibility
    this.server?.to(`execution:${executionId}`).emit('agentProgress', {
      executionId,
      ...progress,
      timestamp: new Date(),
    });
  }

  sendStatus(executionId: string, status: string) {
    this.server?.emit(`execution:${executionId}:status`, { status });
    // Also emit to namespace for backward compatibility
    this.server?.to(`execution:${executionId}`).emit('agentStatus', {
      executionId,
      status,
      timestamp: new Date(),
    });
  }

  sendCompletion(executionId: string, result: any) {
    this.server?.emit(`execution:${executionId}:complete`, { result });
    // Also emit to namespace for backward compatibility
    this.server?.to(`execution:${executionId}`).emit('agentCompleted', {
      executionId,
      result,
      status: 'completed',
      timestamp: new Date(),
    });
  }

  sendError(executionId: string, error: string) {
    this.server?.emit(`execution:${executionId}:error`, { error });
    // Also emit to namespace for backward compatibility
    this.server?.to(`execution:${executionId}`).emit('agentFailed', {
      executionId,
      error,
      status: 'failed',
      timestamp: new Date(),
    });
  }

  sendCancellation(executionId: string) {
    this.server?.emit(`execution:${executionId}:cancelled`, {
      message: 'Execution cancelled by user',
    });
    // Also emit to namespace for backward compatibility
    this.server?.to(`execution:${executionId}`).emit('agentCancelled', {
      executionId,
      message: 'Execution cancelled by user',
      timestamp: new Date(),
    });
  }

  private clientExecutions = new Map<string, Set<string>>(); // clientId -> Set of executionIds
  private executionClients = new Map<string, Set<string>>(); // executionId -> Set of clientIds

  private activeTests = new Map<string, boolean>();

  constructor(
    private readonly agentExecutionService: AgentExecutionService,
    private readonly agentRegistryService: AgentRegistryService,
    private readonly testPromptService: TestPromptService,
  ) {
    // Set the gateway reference in the service to avoid circular dependency
    this.agentExecutionService.setGateway(this);
  }

  handleConnection(client: Socket) {
    this.logger.log(
      `[WebSocket] ✅ Client connected to agent execution gateway: ${client.id}`,
    );
    this.logger.log(
      `[WebSocket] Client ${client.id} - User Agent: ${client.handshake.headers['user-agent']}`,
    );
    this.logger.debug(
      `[WebSocket] Client ${client.id} - Origin: ${client.handshake.headers.origin}`,
    );
    this.logger.debug(
      `[WebSocket] Total connected clients: ${this.server?.engine?.clientsCount || 'unknown'}`,
    );
    this.clientExecutions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `[WebSocket] Client disconnected from agent execution gateway: ${client.id}`,
    );
    this.logger.debug(
      `[WebSocket] Disconnect reason: ${client.disconnected ? 'Client initiated' : 'Server initiated'}`,
    );
    this.logger.debug(
      `[WebSocket] Remaining connected clients: ${(this.server?.engine?.clientsCount || 1) - 1}`,
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

    // Clean up any active tests for this client
    this.activeTests.forEach((_, testId) => {
      if (testId.startsWith(client.id)) {
        this.activeTests.delete(testId);
      }
    });
  }

  // @UseGuards(JwtAuthGuard) // Temporarily disabled for debugging
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

  @SubscribeMessage('execution:cancel')
  handleCancel(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Cancel request for execution ${data.executionId}`);
    // Trigger cancellation via the service
    this.agentExecutionService
      .cancelExecution(data.executionId)
      .then((result) => {
        if (result) {
          client.emit('cancel:acknowledged', { executionId: data.executionId });
        } else {
          client.emit('cancel:failed', {
            executionId: data.executionId,
            error: 'Execution not found or already completed',
          });
        }
      })
      .catch((error) => {
        client.emit('cancel:failed', {
          executionId: data.executionId,
          error: error.message,
        });
      });
  }

  @SubscribeMessage('startTestPrompt')
  async handleStartTestPrompt(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { testId: string; prompt: string; variables: Record<string, any> },
  ) {
    const testId = payload.testId || `${client.id}-${Date.now()}`;
    this.activeTests.set(testId, true);

    try {
      this.logger.log(`[TestPrompt] Starting test prompt execution: ${testId}`);
      this.logger.debug(`[TestPrompt] Client: ${client.id}`);
      this.logger.debug(
        `[TestPrompt] Prompt length: ${payload.prompt?.length || 0} characters`,
      );
      this.logger.debug(
        `[TestPrompt] Variables provided: ${Object.keys(payload.variables || {}).length}`,
      );
      this.logger.debug(
        `[TestPrompt] Variable keys: [${Object.keys(payload.variables || {}).join(', ')}]`,
      );

      // Send initial progress
      this.logger.debug(
        `[TestPrompt] ${testId} - Sending initial progress to client`,
      );
      client.emit('testPromptProgress', {
        testId,
        message: 'Initializing test prompt execution...',
        status: 'initializing',
      });

      // Detect variables if not provided
      this.logger.debug(
        `[TestPrompt] ${testId} - Detecting variables in prompt`,
      );
      const detectedVariables = this.testPromptService.detectVariables(
        payload.prompt,
      );
      this.logger.debug(
        `[TestPrompt] ${testId} - Detected variables: [${detectedVariables.join(', ')}]`,
      );

      if (detectedVariables.length > 0 && !payload.variables) {
        this.logger.debug(
          `[TestPrompt] ${testId} - No variables provided, sending detected variables to client`,
        );
        client.emit('testPromptProgress', {
          testId,
          message: `Detected ${detectedVariables.length} variables: ${detectedVariables.join(', ')}`,
          status: 'variables_detected',
        });
      }

      // Update progress
      this.logger.debug(
        `[TestPrompt] ${testId} - Sending execution progress to client`,
      );
      client.emit('testPromptProgress', {
        testId,
        message: 'Executing prompt...',
        status: 'executing',
      });

      // Execute the test prompt
      this.logger.log(
        `[TestPrompt] ${testId} - Calling TestPromptService.executeTestPrompt()`,
      );
      const startTime = Date.now();
      const result = await this.testPromptService.executeTestPrompt(
        payload.prompt,
        payload.variables || {},
      );
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `[TestPrompt] ${testId} - Execution completed in ${executionTime}ms`,
      );

      // Check if test was stopped
      if (!this.activeTests.has(testId)) {
        this.logger.warn(
          `[TestPrompt] ${testId} - Test was cancelled during execution`,
        );
        client.emit('testPromptComplete', {
          testId,
          result: { output: 'Test cancelled by user' },
          metrics: null,
          cancelled: true,
        });
        return;
      }

      // Send completion
      if (result.error) {
        this.logger.error(
          `[TestPrompt] ${testId} - Execution failed: ${result.error}`,
        );
        this.logger.debug(`[TestPrompt] ${testId} - Sending error to client`);
        client.emit('testPromptError', {
          testId,
          message: result.error,
        });
      } else {
        this.logger.log(`[TestPrompt] ${testId} - Execution successful`);
        this.logger.debug(
          `[TestPrompt] ${testId} - Output length: ${result.output?.length || 0} characters`,
        );
        this.logger.debug(
          `[TestPrompt] ${testId} - Metrics: ${JSON.stringify(result.metrics)}`,
        );

        // Send the full output as a chunk first
        this.logger.debug(`[TestPrompt] ${testId} - Sending chunk to client`);
        client.emit('testPromptChunk', {
          testId,
          chunk: result.output,
        });

        this.logger.debug(
          `[TestPrompt] ${testId} - Sending completion to client`,
        );
        client.emit('testPromptComplete', {
          testId,
          result: result.output,
          metrics: result.metrics,
        });
      }
    } catch (error) {
      this.logger.error(`Error in test prompt ${testId}:`, error);
      client.emit('testPromptError', {
        testId,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      this.activeTests.delete(testId);
    }
  }

  @SubscribeMessage('stopTestPrompt')
  handleStopTestPrompt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { testId: string },
  ) {
    const { testId } = data;

    if (this.activeTests.has(testId)) {
      this.logger.log(`Stopping test prompt: ${testId}`);
      this.activeTests.delete(testId);

      client.emit('testPromptComplete', {
        testId,
        result: { output: 'Test cancelled by user' },
        metrics: null,
        cancelled: true,
      });
    }
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
