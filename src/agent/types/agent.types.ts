export interface AgentParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
}

export interface AgentMethod {
  name: string;
  description?: string;
  parameters: AgentParameter[];
  returnType?: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  methods: AgentMethod[];
}

export interface AgentExecutionContext {
  executionId: string;
  agentId: string;
  methodName: string;
  startTime: Date;
  user?: any;
  updateProgress: (percentage: number, message: string, metadata?: any) => void;
  signal?: AbortSignal; // For cancellation support
}

export interface AgentExecutionProgress {
  executionId: string;
  agentId: string;
  methodName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  message?: string;
  error?: string;
  timestamp: Date;
}

export interface AgentExecutionResult {
  executionId: string;
  agentId: string;
  methodName: string;
  status: 'completed' | 'failed';
  result?: any;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

export type AgentMethodHandler = (
  params: any,
  context?: AgentExecutionContext,
) => Promise<any>;

export interface AgentInstance {
  definition: AgentDefinition;
  instance: any;
  methods: Map<string, AgentMethodHandler>;
}
