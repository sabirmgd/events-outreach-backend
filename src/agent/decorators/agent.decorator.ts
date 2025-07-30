import 'reflect-metadata';
import { AgentDefinition } from '../types/agent.types';

export const AGENT_METADATA_KEY = 'agent:metadata';
export const AGENT_METHODS_KEY = 'agent:methods';

export interface AgentOptions {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export function Agent(options: AgentOptions): ClassDecorator {
  return (target: any) => {
    const agentDefinition: Partial<AgentDefinition> = {
      id: options.id,
      name: options.name,
      description: options.description,
      category: options.category,
      methods: [],
    };

    Reflect.defineMetadata(AGENT_METADATA_KEY, agentDefinition, target);

    // Add a property to identify agent classes
    target.prototype.__isAgent = true;

    return target;
  };
}

export function getAgentMetadata(target: any): AgentDefinition | undefined {
  return Reflect.getMetadata(AGENT_METADATA_KEY, target);
}

export function isAgentClass(target: any): boolean {
  return target.prototype?.__isAgent === true;
}
