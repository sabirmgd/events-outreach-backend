import { Injectable, Logger } from '@nestjs/common';
// import { EventEmitter2 } from '@nestjs/event-emitter'; // Not used currently
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistryService } from './agent-registry.service';
import {
  AgentExecutionContext,
  AgentExecutionProgress,
  AgentExecutionResult,
} from '../types/agent.types';

@Injectable()
export class AgentExecutionService {
  private readonly logger = new Logger(AgentExecutionService.name);
  private readonly activeExecutions = new Map<string, AgentExecutionContext>();

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    // private readonly eventEmitter: EventEmitter2, // Not used currently
  ) {}

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
    };

    this.activeExecutions.set(executionId, context);
    return context;
  }

  async executeWithProgress(
    agentId: string,
    methodName: string,
    params: any,
    executionId?: string,
    user?: any,
  ): Promise<AgentExecutionResult> {
    // Create or use existing execution context
    const context = executionId
      ? this.activeExecutions.get(executionId) ||
        this.createExecutionContext(agentId, methodName, user)
      : this.createExecutionContext(agentId, methodName, user);

    try {
      // Report initial progress
      await this.reportProgress(context.executionId, {
        executionId: context.executionId,
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

      // Create wrapped context with progress reporting
      const wrappedContext = this.createWrappedContext(context);

      // Execute the agent method
      const result = await this.agentRegistry.executeAgentMethod(
        agentId,
        methodName,
        params,
        wrappedContext,
      );

      // Calculate execution time
      const executionTime = Date.now() - context.startTime.getTime();

      // Report completion
      await this.reportProgress(context.executionId, {
        executionId: context.executionId,
        agentId,
        methodName,
        status: 'completed',
        progress: 100,
        message: 'Agent execution completed',
        timestamp: new Date(),
      });

      // Create result
      const executionResult: AgentExecutionResult = {
        executionId: context.executionId,
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

      // Clean up
      this.activeExecutions.delete(context.executionId);

      // Emit completion event
      // this.eventEmitter.emit('agent.execution.completed', executionResult);

      return executionResult;
    } catch (error) {
      // Report error
      await this.reportProgress(context.executionId, {
        executionId: context.executionId,
        agentId,
        methodName,
        status: 'failed',
        progress: 0,
        error: error.message,
        timestamp: new Date(),
      });

      // Calculate execution time
      const executionTime = Date.now() - context.startTime.getTime();

      // Create error result
      const executionResult: AgentExecutionResult = {
        executionId: context.executionId,
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

      // Clean up
      this.activeExecutions.delete(context.executionId);

      // Emit error event
      // this.eventEmitter.emit('agent.execution.failed', executionResult);

      throw error;
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
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      this.logger.warn(`No active execution found for ${executionId}`);
      return;
    }

    const progressData: AgentExecutionProgress = {
      executionId,
      agentId: context.agentId,
      methodName: context.methodName,
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
    const context = this.activeExecutions.get(executionId);
    if (!context) {
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
    //   agentId: context.agentId,
    //   methodName: context.methodName,
    //   status,
    //   details,
    //   timestamp: new Date(),
    // });
  }

  getActiveExecutions(): AgentExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  getExecution(executionId: string): AgentExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  async cancelExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`No active execution found for ${executionId}`);
    }

    // Report cancellation
    await this.reportProgress(executionId, {
      executionId,
      agentId: context.agentId,
      methodName: context.methodName,
      status: 'failed',
      progress: 0,
      error: 'Execution cancelled by user',
      timestamp: new Date(),
    });

    // Clean up
    this.activeExecutions.delete(executionId);

    // Emit cancellation event
    // this.eventEmitter.emit('agent.execution.cancelled', {
    //   executionId,
    //   agentId: context.agentId,
    //   methodName: context.methodName,
    //   timestamp: new Date(),
    // });
  }
}
