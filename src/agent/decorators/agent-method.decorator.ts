import 'reflect-metadata';
import { AgentMethod, AgentParameter } from '../types/agent.types';
import { AGENT_METHODS_KEY } from './agent.decorator';

export interface AgentMethodOptions {
  description?: string;
  parameters?: AgentParameter[];
  returnType?: string;
}

export function AgentMethod(options: AgentMethodOptions = {}): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const methodName = String(propertyKey);

    // Get existing methods or initialize
    const existingMethods: AgentMethod[] =
      (Reflect.getMetadata(
        AGENT_METHODS_KEY,
        target.constructor,
      ) as AgentMethod[]) || [];

    // Extract parameter types from TypeScript metadata
    const paramTypes: unknown[] =
      (Reflect.getMetadata(
        'design:paramtypes',
        target,
        propertyKey,
      ) as unknown[]) || [];
    const returnType: unknown = Reflect.getMetadata(
      'design:returntype',
      target,
      propertyKey,
    );

    // Create method definition
    const methodDef: AgentMethod = {
      name: methodName,
      description: options.description,
      parameters:
        options.parameters ||
        extractParameters(target, propertyKey, paramTypes),
      returnType: options.returnType || getTypeName(returnType),
    };

    // Add to methods array
    existingMethods.push(methodDef);

    // Store updated methods
    Reflect.defineMetadata(
      AGENT_METHODS_KEY,
      existingMethods,
      target.constructor,
    );

    // Mark method as agent method
    if (descriptor && descriptor.value) {
      descriptor.value.__isAgentMethod = true;
    }

    return descriptor;
  };
}

function extractParameters(
  target: object,
  propertyKey: string | symbol,
  paramTypes: unknown[],
): AgentParameter[] {
  // Try to get parameter names from the function
  const method = (target as Record<string | symbol, any>)[
    propertyKey
  ] as (...args: any[]) => any;
  const paramNames = getParamNames(method);

  return paramTypes.map((type, index) => ({
    name: paramNames[index] || `param${index}`,
    type: getTypeName(type),
    required: true,
  }));
}

function getParamNames(func: (...args: any[]) => any): string[] {
  const funcStr = func.toString();
  const match = funcStr.match(/\(([^)]*)\)/);

  if (!match || !match[1]) {
    return [];
  }

  return match[1]
    .split(',')
    .map((param) => param.trim())
    .map((param) => param.split(/\s+/)[0])
    .filter((param) => param && param !== '');
}

function getTypeName(type: unknown): string {
  if (!type) return 'any';

  switch (type) {
    case String:
      return 'string';
    case Number:
      return 'number';
    case Boolean:
      return 'boolean';
    case Array:
      return 'array';
    case Object:
      return 'object';
    case Promise:
      return 'promise';
    default:
      return (type as any)?.name || 'any';
  }
}

export function getAgentMethods(target: object): AgentMethod[] {
  return (
    (Reflect.getMetadata(AGENT_METHODS_KEY, target) as AgentMethod[]) || []
  );
}

export function isAgentMethod(target: object, propertyKey: string): boolean {
  const method = (target as Record<string, any>)[propertyKey];
  return method && method.__isAgentMethod === true;
}
