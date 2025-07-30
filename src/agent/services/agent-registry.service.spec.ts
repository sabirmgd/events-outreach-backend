import { Test, TestingModule } from '@nestjs/testing';
import { ModulesContainer } from '@nestjs/core';
import { AgentRegistryService } from './agent-registry.service';
import { Agent, AgentMethod } from '../decorators';
import { Injectable } from '@nestjs/common';

// Test agent for testing
@Injectable()
@Agent({
  id: 'test-agent',
  name: 'Test Agent',
  description: 'A test agent',
  category: 'test',
})
class TestAgent {
  @AgentMethod({
    description: 'Test method',
    parameters: [{ name: 'input', type: 'string', required: true }],
  })
  async testMethod(params: { input: string }) {
    return { result: `Processed: ${params.input}` };
  }
}

describe('AgentRegistryService', () => {
  let service: AgentRegistryService;
  let modulesContainer: ModulesContainer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentRegistryService,
        {
          provide: ModulesContainer,
          useValue: {
            values: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<AgentRegistryService>(AgentRegistryService);
    modulesContainer = module.get<ModulesContainer>(ModulesContainer);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerAgent', () => {
    it('should register an agent manually', () => {
      const testAgent = new TestAgent();
      const agentInstance = {
        definition: {
          id: 'test-agent',
          name: 'Test Agent',
          description: 'A test agent',
          category: 'test',
          methods: [
            {
              name: 'testMethod',
              description: 'Test method',
              parameters: [{ name: 'input', type: 'string', required: true }],
            },
          ],
        },
        instance: testAgent,
        methods: new Map([
          ['testMethod', testAgent.testMethod.bind(testAgent)],
        ]),
      };

      service.registerAgent(agentInstance);
      const registeredAgent = service.getAgent('test-agent');

      expect(registeredAgent).toBeDefined();
      expect(registeredAgent?.definition.id).toBe('test-agent');
    });
  });

  describe('getAllAgents', () => {
    it('should return all registered agents', () => {
      const testAgent = new TestAgent();
      const agentInstance = {
        definition: {
          id: 'test-agent',
          name: 'Test Agent',
          description: 'A test agent',
          category: 'test',
          methods: [],
        },
        instance: testAgent,
        methods: new Map(),
      };

      service.registerAgent(agentInstance);
      const agents = service.getAllAgents();

      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('test-agent');
    });
  });

  describe('getAgentsByCategory', () => {
    it('should return agents by category', () => {
      const testAgent1 = new TestAgent();
      const testAgent2 = new TestAgent();

      service.registerAgent({
        definition: {
          id: 'test-agent-1',
          name: 'Test Agent 1',
          category: 'test',
          methods: [],
        },
        instance: testAgent1,
        methods: new Map(),
      });

      service.registerAgent({
        definition: {
          id: 'test-agent-2',
          name: 'Test Agent 2',
          category: 'other',
          methods: [],
        },
        instance: testAgent2,
        methods: new Map(),
      });

      const testAgents = service.getAgentsByCategory('test');
      expect(testAgents).toHaveLength(1);
      expect(testAgents[0].id).toBe('test-agent-1');
    });
  });

  describe('executeAgentMethod', () => {
    it('should execute agent method successfully', async () => {
      const testAgent = new TestAgent();
      const agentInstance = {
        definition: {
          id: 'test-agent',
          name: 'Test Agent',
          category: 'test',
          methods: [],
        },
        instance: testAgent,
        methods: new Map([
          ['testMethod', testAgent.testMethod.bind(testAgent)],
        ]),
      };

      service.registerAgent(agentInstance);
      const result = await service.executeAgentMethod(
        'test-agent',
        'testMethod',
        { input: 'Hello' },
      );

      expect(result).toEqual({ result: 'Processed: Hello' });
    });

    it('should throw error if agent not found', async () => {
      await expect(
        service.executeAgentMethod('non-existent', 'method', {}),
      ).rejects.toThrow("Agent 'non-existent' not found");
    });

    it('should throw error if method not found', async () => {
      const testAgent = new TestAgent();
      service.registerAgent({
        definition: {
          id: 'test-agent',
          name: 'Test Agent',
          category: 'test',
          methods: [],
        },
        instance: testAgent,
        methods: new Map(),
      });

      await expect(
        service.executeAgentMethod('test-agent', 'nonExistentMethod', {}),
      ).rejects.toThrow(
        "Method 'nonExistentMethod' not found on agent 'test-agent'",
      );
    });
  });

  describe('validateMethodParams', () => {
    it('should validate required parameters', () => {
      const testAgent = new TestAgent();
      service.registerAgent({
        definition: {
          id: 'test-agent',
          name: 'Test Agent',
          category: 'test',
          methods: [
            {
              name: 'testMethod',
              parameters: [
                { name: 'input', type: 'string', required: true },
                { name: 'optional', type: 'string', required: false },
              ],
            },
          ],
        },
        instance: testAgent,
        methods: new Map(),
      });

      const validResult = service.validateMethodParams(
        'test-agent',
        'testMethod',
        { input: 'test' },
      );
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = service.validateMethodParams(
        'test-agent',
        'testMethod',
        {},
      );
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain(
        'Missing required parameter: input',
      );
    });
  });
});
