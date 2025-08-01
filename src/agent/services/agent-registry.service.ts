import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  AgentInstance,
  AgentDefinition,
  AgentMethodHandler,
  AgentMethod,
  AgentParameter,
} from '../types/agent.types';
import {
  getAgentMetadata,
  getAgentMethods,
  isAgentClass,
  isAgentMethod,
} from '../decorators';

@Injectable()
export class AgentRegistryService implements OnModuleInit {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly agents = new Map<string, AgentInstance>();

  constructor(private readonly modulesContainer: ModulesContainer) {}

  async onModuleInit() {
    await this.discoverAgents();
  }

  private async discoverAgents() {
    this.logger.log('Discovering agents...');

    const modules = [...this.modulesContainer.values()];

    for (const module of modules) {
      const providers = [...module.providers.values()];

      for (const provider of providers) {
        if (this.isValidProvider(provider)) {
          await this.processProvider(provider);
        }
      }
    }

    this.logger.log(`Discovered ${this.agents.size} agents`);
  }

  private isValidProvider(wrapper: InstanceWrapper): boolean {
    return wrapper && wrapper.metatype && !wrapper.isAlias && wrapper.instance;
  }

  private async processProvider(wrapper: InstanceWrapper) {
    const { metatype, instance } = wrapper;

    if (!metatype || !isAgentClass(metatype)) {
      return;
    }

    const metadata = getAgentMetadata(metatype);
    if (!metadata) {
      return;
    }

    const methods = getAgentMethods(metatype);
    if (!methods || methods.length === 0) {
      return;
    }

    // Create complete agent definition
    const definition: AgentDefinition = {
      ...metadata,
      methods,
    };

    // Create method handlers map
    const methodHandlers = new Map<string, AgentMethodHandler>();

    for (const method of methods) {
      if (isAgentMethod(instance, method.name)) {
        const handler = instance[method.name].bind(instance);
        methodHandlers.set(method.name, handler);
      }
    }

    // Register agent
    const agentInstance: AgentInstance = {
      definition,
      instance,
      methods: methodHandlers,
    };

    this.agents.set(definition.id, agentInstance);
    this.logger.log(`Registered agent: ${definition.name} (${definition.id})`);
  }

  registerAgent(agentInstance: AgentInstance) {
    const { definition } = agentInstance;
    this.agents.set(definition.id, agentInstance);
    this.logger.log(
      `Manually registered agent: ${definition.name} (${definition.id})`,
    );
  }

  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values()).map((agent) => agent.definition);
  }

  getAgentsByCategory(category: string): AgentDefinition[] {
    return Array.from(this.agents.values())
      .filter((agent) => agent.definition.category === category)
      .map((agent) => agent.definition);
  }

  async executeAgentMethod(
    agentId: string,
    methodName: string,
    params: any,
    context?: any,
  ): Promise<any> {
    const agent = this.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    const method = agent.methods.get(methodName);

    if (!method) {
      throw new Error(`Method '${methodName}' not found on agent '${agentId}'`);
    }

    try {
      // If params is an object, extract values in the order of method parameters
      if (params && typeof params === 'object' && !Array.isArray(params)) {
        const methodDef = this.getMethodDefinition(agentId, methodName);
        if (methodDef && methodDef.parameters) {
          const orderedParams = methodDef.parameters.map((p: AgentParameter) => params[p.name]);
          // Create an array with params and context
          const allParams = [...orderedParams, context];
          return await method.apply(null, allParams);
        }
      }
      
      // Fallback to direct call
      return await method(params, context);
    } catch (error) {
      this.logger.error(
        `Error executing ${agentId}.${methodName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  getMethodDefinition(agentId: string, methodName: string): AgentMethod | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;
    
    return agent.definition.methods.find(m => m.name === methodName);
  }

  validateMethodParams(
    agentId: string,
    methodName: string,
    params: any,
  ): { isValid: boolean; errors: string[] } {
    const agent = this.agents.get(agentId);

    if (!agent) {
      return { isValid: false, errors: [`Agent '${agentId}' not found`] };
    }

    const methodDef = agent.definition.methods.find(
      (m) => m.name === methodName,
    );

    if (!methodDef) {
      return {
        isValid: false,
        errors: [`Method '${methodName}' not found on agent '${agentId}'`],
      };
    }

    const errors: string[] = [];

    // Validate required parameters
    for (const paramDef of methodDef.parameters) {
      if (paramDef.required && !(paramDef.name in params)) {
        errors.push(`Missing required parameter: ${paramDef.name}`);
      }
    }

    // Type validation could be added here if needed

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getAgentMethod(agentId: string, methodName: string) {
    const agent = this.agents.get(agentId);

    if (!agent) {
      return undefined;
    }

    return agent.definition.methods.find((m) => m.name === methodName);
  }
}
