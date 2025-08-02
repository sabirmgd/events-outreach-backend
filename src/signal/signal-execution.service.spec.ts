import { Test, TestingModule } from '@nestjs/testing';
import { SignalExecutionService } from './signal-execution.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignalExecution } from './entities/signal-execution.entity';
import { SignalService } from './signal.service';
import { AgentExecutionService } from '../agent/services/agent-execution.service';
import { PromptsService } from '../prompts/services/prompts.service';
import { EventService } from '../event/event.service';
import { CompanyService } from '../company/company.service';
import { PersonaService } from '../persona/persona.service';
import { GeographyService } from '../geography/geography.service';
import { EventSponsor } from '../event/entities/event-sponsor.entity';
import { CompanyPersonRole } from '../persona/entities/company-person-role.entity';

describe('SignalExecutionService', () => {
  let service: SignalExecutionService;
  let executionRepository: Repository<SignalExecution>;
  let eventSponsorRepository: Repository<EventSponsor>;
  let companyPersonRoleRepository: Repository<CompanyPersonRole>;

  const mockExecutionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEventSponsorRepository = {
    save: jest.fn(),
  };

  const mockCompanyPersonRoleRepository = {
    save: jest.fn(),
  };

  const mockSignalService = {
    findOne: jest.fn(),
    updateStats: jest.fn(),
  };

  const mockAgentExecutionService = {
    executeWithProgress: jest.fn(),
  };

  const mockPromptsService = {
    getPublishedPromptBody: jest.fn(),
  };

  const mockEventService = {
    create: jest.fn(),
  };

  const mockCompanyService = {
    findByName: jest.fn(),
    create: jest.fn(),
  };

  const mockPersonaService = {
    findByLinkedIn: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockGeographyService = {
    findOrCreateCity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalExecutionService,
        {
          provide: getRepositoryToken(SignalExecution),
          useValue: mockExecutionRepository,
        },
        {
          provide: getRepositoryToken(EventSponsor),
          useValue: mockEventSponsorRepository,
        },
        {
          provide: getRepositoryToken(CompanyPersonRole),
          useValue: mockCompanyPersonRoleRepository,
        },
        {
          provide: SignalService,
          useValue: mockSignalService,
        },
        {
          provide: AgentExecutionService,
          useValue: mockAgentExecutionService,
        },
        {
          provide: PromptsService,
          useValue: mockPromptsService,
        },
        {
          provide: EventService,
          useValue: mockEventService,
        },
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
        {
          provide: PersonaService,
          useValue: mockPersonaService,
        },
        {
          provide: GeographyService,
          useValue: mockGeographyService,
        },
      ],
    }).compile();

    service = module.get<SignalExecutionService>(SignalExecutionService);
    executionRepository = module.get<Repository<SignalExecution>>(
      getRepositoryToken(SignalExecution),
    );
    eventSponsorRepository = module.get<Repository<EventSponsor>>(
      getRepositoryToken(EventSponsor),
    );
    companyPersonRoleRepository = module.get<Repository<CompanyPersonRole>>(
      getRepositoryToken(CompanyPersonRole),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseEventResults', () => {
    it('should parse JSON string with events array', () => {
      const input =
        '{"reasoning": "Found events", "events": [{"name": "AI Summit"}]}';
      const result = service['parseEventResults'](input);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('AI Summit');
    });

    it('should handle direct object with events property', () => {
      const input = { events: [{ name: 'Tech Conference' }] };
      const result = service['parseEventResults'](input);
      expect(result).toEqual(input.events);
    });

    it('should handle direct array input', () => {
      const input = [{ name: 'Tech Conference' }];
      const result = service['parseEventResults'](input);
      expect(result).toEqual(input);
    });

    it('should return empty array for invalid input', () => {
      const result = service['parseEventResults']('invalid json');
      expect(result).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(service['parseEventResults'](null)).toEqual([]);
      expect(service['parseEventResults'](undefined)).toEqual([]);
    });

    it('should extract JSON from mixed text content', () => {
      const input =
        'Some text before {"reasoning": "test", "events": [{"name": "Event 1"}]} some text after';
      const result = service['parseEventResults'](input);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Event 1');
    });
  });

  describe('parseSponsorResults', () => {
    it('should handle array of company names', () => {
      const input = ['Company A', 'Company B', 'Company C'];
      const result = service['parseSponsorResults'](input);
      expect(result).toEqual(input);
    });

    it('should parse company names from bullet list', () => {
      const input = `- Company A
- Company B
- Company C`;
      const result = service['parseSponsorResults'](input);
      expect(result).toEqual(['Company A', 'Company B', 'Company C']);
    });

    it('should parse company names from numbered list', () => {
      const input = `1. Company A
2. Company B
3. Company C`;
      const result = service['parseSponsorResults'](input);
      expect(result).toEqual(['Company A', 'Company B', 'Company C']);
    });

    it('should return empty array for invalid input', () => {
      expect(service['parseSponsorResults'](null)).toEqual([]);
      expect(service['parseSponsorResults']({})).toEqual([]);
      expect(service['parseSponsorResults']('')).toEqual([]);
    });

    it('should handle mixed format lists', () => {
      const input = `Some sponsors include:
- TechCorp
1. InnovateCo
- DataSystems
Regular text here
2. CloudPlatform`;
      const result = service['parseSponsorResults'](input);
      expect(result).toContain('TechCorp');
      expect(result).toContain('InnovateCo');
      expect(result).toContain('DataSystems');
      expect(result).toContain('CloudPlatform');
    });
  });

  describe('parseContactResults', () => {
    it('should handle direct array of contacts', () => {
      const input = [
        { name: 'John Doe', title: 'CEO' },
        { name: 'Jane Smith', title: 'CTO' },
      ];
      const result = service['parseContactResults'](input);
      expect(result).toEqual(input);
    });

    it('should extract contacts from object with contacts property', () => {
      const input = {
        contacts: [
          { name: 'John Doe', title: 'CEO' },
          { name: 'Jane Smith', title: 'CTO' },
        ],
      };
      const result = service['parseContactResults'](input);
      expect(result).toEqual(input.contacts);
    });

    it('should extract contacts from object with pocs property', () => {
      const input = {
        pocs: [
          { name: 'John Doe', title: 'CEO' },
          { name: 'Jane Smith', title: 'CTO' },
        ],
      };
      const result = service['parseContactResults'](input);
      expect(result).toEqual(input.pocs);
    });

    it('should return empty array for invalid input', () => {
      expect(service['parseContactResults'](null)).toEqual([]);
      expect(service['parseContactResults'](undefined)).toEqual([]);
      expect(service['parseContactResults']({})).toEqual([]);
      expect(service['parseContactResults']('string')).toEqual([]);
    });

    it('should handle nested structure', () => {
      const input = {
        data: {
          contacts: [{ name: 'Test Person' }],
        },
      };
      // This should return empty array as it doesn't match expected structure
      const result = service['parseContactResults'](input);
      expect(result).toEqual([]);
    });
  });

  describe('extractSeniority', () => {
    it('should identify C-Suite titles', () => {
      expect(service['extractSeniority']('Chief Executive Officer')).toBe(
        'C-Suite',
      );
      expect(service['extractSeniority']('CEO')).toBe('C-Suite');
      expect(service['extractSeniority']('Chief Technology Officer')).toBe(
        'C-Suite',
      );
      expect(service['extractSeniority']('CTO')).toBe('C-Suite');
      expect(service['extractSeniority']('Chief Marketing Officer')).toBe(
        'C-Suite',
      );
      expect(service['extractSeniority']('CMO')).toBe('C-Suite');
      expect(service['extractSeniority']('Chief Financial Officer')).toBe(
        'C-Suite',
      );
      expect(service['extractSeniority']('CFO')).toBe('C-Suite');
    });

    it('should identify VP level', () => {
      expect(service['extractSeniority']('VP of Sales')).toBe('VP');
      expect(service['extractSeniority']('Vice President Marketing')).toBe(
        'VP',
      );
    });

    it('should identify Director level', () => {
      expect(service['extractSeniority']('Director of Engineering')).toBe(
        'Director',
      );
      expect(service['extractSeniority']('Head of Product')).toBe('Director');
    });

    it('should identify Manager level', () => {
      expect(service['extractSeniority']('Product Manager')).toBe('Manager');
      expect(service['extractSeniority']('Engineering Manager')).toBe(
        'Manager',
      );
    });

    it('should default to Individual Contributor', () => {
      expect(service['extractSeniority']('Software Engineer')).toBe(
        'Individual Contributor',
      );
      expect(service['extractSeniority']('Sales Representative')).toBe(
        'Individual Contributor',
      );
    });

    it('should be case insensitive', () => {
      expect(service['extractSeniority']('ceo')).toBe('C-Suite');
      expect(service['extractSeniority']('VICE PRESIDENT')).toBe('VP');
    });
  });

  describe('getRoleCategory', () => {
    it('should categorize marketing roles', () => {
      expect(service['getRoleCategory']('VP Marketing')).toBe('marketing');
      expect(service['getRoleCategory']('Chief Marketing Officer')).toBe(
        'marketing',
      );
      expect(service['getRoleCategory']('Marketing Director')).toBe(
        'marketing',
      );
    });

    it('should categorize sales roles', () => {
      expect(service['getRoleCategory']('VP Sales')).toBe('sales');
      expect(service['getRoleCategory']('Head of Revenue')).toBe('sales');
      expect(service['getRoleCategory']('Sales Director')).toBe('sales');
    });

    it('should categorize partnership roles', () => {
      expect(service['getRoleCategory']('VP Partnerships')).toBe(
        'partnerships',
      );
      expect(service['getRoleCategory']('Head of Alliances')).toBe(
        'partnerships',
      );
      expect(service['getRoleCategory']('Partner Manager')).toBe(
        'partnerships',
      );
    });

    it('should categorize C-level roles', () => {
      expect(service['getRoleCategory']('CEO')).toBe('c_level');
      expect(service['getRoleCategory']('CTO')).toBe('c_level');
      expect(service['getRoleCategory']('CFO')).toBe('c_level');
      expect(service['getRoleCategory']('COO')).toBe('c_level');
    });

    it('should default to other', () => {
      expect(service['getRoleCategory']('Software Engineer')).toBe('other');
      expect(service['getRoleCategory']('Product Manager')).toBe('other');
    });

    it('should be case insensitive', () => {
      expect(service['getRoleCategory']('ceo')).toBe('c_level');
      expect(service['getRoleCategory']('VP SALES')).toBe('sales');
    });
  });
});
