import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistryService } from './agent-registry.service';
import {
  AgentExecutionContext,
  AgentExecutionProgress,
  AgentExecutionResult,
} from '../types/agent.types';

export interface ExecutionRecord {
  executionId: string;
  agentId: string;
  methodName: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  cancellationToken?: AbortController;
  progress: {
    percentage: number;
    message: string;
    metadata?: any;
  };
  user?: any;
}

@Injectable()
export class AgentExecutionService {
  private readonly logger = new Logger(AgentExecutionService.name);
  private readonly executions = new Map<string, ExecutionRecord>();

  private gateway: any; // Will be set by the gateway

  constructor(
    private readonly agentRegistry: AgentRegistryService,
  ) {}
  
  setGateway(gateway: any) {
    this.gateway = gateway;
  }

  createExecutionContext(
    agentId: string,
    methodName: string,
    user?: any,
  ): AgentExecutionContext {
    const executionId = uuidv4();
    const context: AgentExecutionContext = {
      executionId,
      agentId,
      methodName,
      startTime: new Date(),
      user,
      updateProgress: () => {}, // Placeholder, will be set later
      signal: undefined, // Will be set later
    };
    return context;
  }

  async executeWithProgress(
    agentId: string,
    methodName: string,
    params: any,
    executionId?: string,
    user?: any,
  ): Promise<AgentExecutionResult> {
    const execId = executionId || uuidv4();
    
    // Create cancellation token
    const abortController = new AbortController();
    
    // Initialize execution record
    const execution: ExecutionRecord = {
      executionId: execId,
      agentId,
      methodName,
      parameters: params,
      status: 'pending',
      startTime: new Date(),
      cancellationToken: abortController,
      progress: {
        percentage: 0,
        message: 'Starting execution...',
      },
      user,
    };
    
    this.executions.set(execId, execution);

    // Create context with cancellation support
    const context: AgentExecutionContext = {
      executionId: execId,
      agentId,
      methodName,
      startTime: new Date(),
      user,
      updateProgress: (percentage: number, message: string, metadata?: any) => {
        // Check if cancelled
        if (abortController.signal.aborted) {
          throw new Error('Execution cancelled');
        }
        
        execution.progress = { percentage, message, metadata };
        this.sendProgress(execId, { percentage, message, metadata });
      },
      signal: abortController.signal,
    };

    try {
      execution.status = 'running';
      this.sendStatus(execId, 'running');

      // Report initial progress
      await this.reportProgress(execId, {
        executionId: execId,
        agentId,
        methodName,
        status: 'running',
        progress: 0,
        message: 'Starting agent execution',
        timestamp: new Date(),
      });

      // Validate parameters
      const validation = this.agentRegistry.validateMethodParams(
        agentId,
        methodName,
        params,
      );

      if (!validation.isValid) {
        throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
      }

      // Create wrapped context
      const wrappedContext = this.createWrappedContext(context);

      // Execute with cancellation support
      const result = await this.executeWithCancellation(
        () => this.agentRegistry.executeAgentMethod(
          agentId,
          methodName,
          params,
          wrappedContext,
        ),
        abortController.signal,
      );

      execution.status = 'completed';
      execution.result = result;
      execution.endTime = new Date();
      
      // Calculate execution time
      const executionTime = execution.endTime.getTime() - execution.startTime.getTime();

      // Report completion
      await this.reportProgress(execId, {
        executionId: execId,
        agentId,
        methodName,
        status: 'completed',
        progress: 100,
        message: 'Agent execution completed',
        timestamp: new Date(),
      });

      this.sendCompletion(execId, result);

      // Create result
      const executionResult: AgentExecutionResult = {
        executionId: execId,
        agentId,
        methodName,
        status: 'completed',
        result,
        executionTime,
        metadata: {
          user: user?.id,
          timestamp: new Date().toISOString(),
        },
      };

      return executionResult;
    } catch (error) {
      execution.status = error.message === 'Execution cancelled' ? 'cancelled' : 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
      
      // Calculate execution time
      const executionTime = Date.now() - execution.startTime.getTime();

      if (execution.status === 'cancelled') {
        this.sendCancellation(execId);
      } else {
        // Report error
        await this.reportProgress(execId, {
          executionId: execId,
          agentId,
          methodName,
          status: 'failed',
          progress: 0,
          error: error.message,
          timestamp: new Date(),
        });
        this.sendError(execId, error.message);
      }

      // Create error result
      const executionResult: AgentExecutionResult = {
        executionId: execId,
        agentId,
        methodName,
        status: 'failed',
        error: error.message,
        executionTime,
        metadata: {
          user: user?.id,
          timestamp: new Date().toISOString(),
          errorStack: error.stack,
        },
      };

      throw error;
    } finally {
      // Clean up after a delay
      setTimeout(() => {
        this.executions.delete(execId);
      }, 300000); // Keep for 5 minutes for history
    }
  }

  private createWrappedContext(context: AgentExecutionContext) {
    return {
      ...context,
      reportProgress: (
        progress: number,
        message?: string,
        currentStep?: number,
        totalSteps?: number,
      ) => {
        return this.reportStep(
          context.executionId,
          progress,
          message,
          currentStep,
          totalSteps,
        );
      },
      reportStatus: (status: string, details?: any) => {
        return this.reportStatus(context.executionId, status, details);
      },
    };
  }

  async reportProgress(
    executionId: string,
    progress: AgentExecutionProgress,
  ): Promise<void> {
    this.logger.debug(
      `Progress for ${executionId}: ${progress.status} - ${progress.progress}%`,
    );

    // Emit progress event
    // this.eventEmitter.emit('agent.execution.progress', progress);
  }

  async reportStep(
    executionId: string,
    progress: number,
    message?: string,
    currentStep?: number,
    totalSteps?: number,
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      this.logger.warn(`No active execution found for ${executionId}`);
      return;
    }

    const progressData: AgentExecutionProgress = {
      executionId,
      agentId: execution.agentId,
      methodName: execution.methodName,
      status: 'running',
      progress,
      message,
      currentStep: currentStep?.toString(),
      totalSteps,
      timestamp: new Date(),
    };

    await this.reportProgress(executionId, progressData);
  }

  async reportStatus(
    executionId: string,
    status: string,
    details?: any,
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      this.logger.warn(`No active execution found for ${executionId}`);
      return;
    }

    this.logger.debug(
      `Status for ${executionId}: ${status}`,
      details ? JSON.stringify(details) : '',
    );

    // Emit status event
    // this.eventEmitter.emit('agent.execution.status', {
    //   executionId,
    //   agentId: execution.agentId,
    //   methodName: execution.methodName,
    //   status,
    //   details,
    //   timestamp: new Date(),
    // });
  }

  private async executeWithCancellation<T>(
    executeFn: () => Promise<T>,
    signal: AbortSignal,
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      // Handle abort signal
      const onAbort = () => {
        reject(new Error('Execution cancelled'));
      };
      
      signal.addEventListener('abort', onAbort);
      
      try {
        const result = await executeFn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
    });
  }

  getActiveExecutions(): Array<Omit<ExecutionRecord, 'cancellationToken'>> {
    const activeExecutions = Array.from(this.executions.values())
      .filter(exec => exec.status === 'running' || exec.status === 'pending')
      .map(({ cancellationToken, ...rest }) => rest); // Remove internal fields
      
    return activeExecutions;
  }

  async getExecution(executionId: string): Promise<Omit<ExecutionRecord, 'cancellationToken'> | null> {
    const execution = this.executions.get(executionId);
    
    if (!execution) {
      return null;
    }
    
    const { cancellationToken, ...rest } = execution;
    return rest;
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    
    if (!execution) {
      return false;
    }

    if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
      return false;
    }

    // Trigger cancellation
    execution.cancellationToken?.abort();
    execution.status = 'cancelled';
    execution.endTime = new Date();
    
    // Notify via WebSocket
    this.sendCancellation(executionId);
    
    this.logger.log(`Cancelled execution ${executionId}`);
    
    return true;
  }

  // WebSocket communication methods
  private sendProgress(executionId: string, progress: any) {
    this.gateway.server?.emit(`execution:${executionId}:progress`, progress);
  }

  private sendStatus(executionId: string, status: string) {
    this.gateway.server?.emit(`execution:${executionId}:status`, { status });
  }

  private sendCompletion(executionId: string, result: any) {
    this.gateway.server?.emit(`execution:${executionId}:complete`, { result });
  }

  private sendError(executionId: string, error: string) {
    this.gateway.server?.emit(`execution:${executionId}:error`, { error });
  }

  private sendCancellation(executionId: string) {
    this.gateway.server?.emit(`execution:${executionId}:cancelled`, {
      message: 'Execution cancelled by user',
    });
  }
}
