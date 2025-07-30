import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import {
  Prompt,
  PromptVersion,
  PromptTag,
  PromptTestCase,
  PromptVersionStatus,
} from '../entities';

describe('PromptsService', () => {
  let service: PromptsService;

  const mockPromptRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVersionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockTagRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockTestCaseRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptsService,
        {
          provide: getRepositoryToken(Prompt),
          useValue: mockPromptRepository,
        },
        {
          provide: getRepositoryToken(PromptVersion),
          useValue: mockVersionRepository,
        },
        {
          provide: getRepositoryToken(PromptTag),
          useValue: mockTagRepository,
        },
        {
          provide: getRepositoryToken(PromptTestCase),
          useValue: mockTestCaseRepository,
        },
      ],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new prompt with initial version', async () => {
      const createDto = {
        key: 'test-prompt',
        name: 'Test Prompt',
        namespace: 'test',
        body: 'Hello {{name}}!',
      };

      const mockPrompt = {
        id: '1',
        ...createDto,
        variables: { name: { type: 'string', required: true } },
      };
      const mockVersion = { id: 'v1', promptId: '1', version: 1 };

      mockPromptRepository.findOne
        .mockResolvedValueOnce(null) // First call - check if exists
        .mockResolvedValueOnce({
          // Second call - return created prompt with relations
          ...mockPrompt,
          versions: [mockVersion],
          tags: [],
          testCases: [],
        });
      mockPromptRepository.create.mockReturnValue(mockPrompt);
      mockPromptRepository.save.mockResolvedValue(mockPrompt);
      mockVersionRepository.create.mockReturnValue(mockVersion);
      mockVersionRepository.save.mockResolvedValue(mockVersion);

      const result = await service.create(createDto);

      expect(mockPromptRepository.findOne).toHaveBeenCalledWith({
        where: { key: 'test-prompt' },
      });
      expect(mockPromptRepository.create).toHaveBeenCalled();
      expect(mockVersionRepository.create).toHaveBeenCalledWith({
        promptId: '1',
        version: 1,
        body: 'Hello {{name}}!',
        status: PromptVersionStatus.DRAFT,
        changelog: 'Initial version',
        metadata: undefined,
      });
      expect(result).toEqual({
        ...mockPrompt,
        versions: [mockVersion],
        tags: [],
        testCases: [],
      });
    });

    it('should throw ConflictException if prompt key already exists', async () => {
      const createDto = {
        key: 'existing-prompt',
        name: 'Test Prompt',
        namespace: 'test',
        body: 'Hello!',
      };

      mockPromptRepository.findOne.mockResolvedValue({ id: '1' });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a prompt by id', async () => {
      const mockPrompt = {
        id: '1',
        key: 'test-prompt',
        versions: [],
        tags: [],
        testCases: [],
      };

      mockPromptRepository.findOne.mockResolvedValue(mockPrompt);

      const result = await service.findOne('1');

      expect(mockPromptRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['versions', 'tags', 'testCases'],
      });
      expect(result).toEqual(mockPrompt);
    });

    it('should throw NotFoundException if prompt not found', async () => {
      mockPromptRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publishVersion', () => {
    it('should publish a version and archive previous published version', async () => {
      const promptId = '1';
      const versionId = 'v2';
      const publishDto = { publishedBy: 'user@example.com' };

      const mockPrompt = { id: promptId };
      const mockVersion = {
        id: versionId,
        promptId,
        status: PromptVersionStatus.DRAFT,
      };

      mockPromptRepository.findOne.mockResolvedValue(mockPrompt);
      mockVersionRepository.findOne.mockResolvedValue(mockVersion);
      mockVersionRepository.update.mockResolvedValue({ affected: 1 });
      mockVersionRepository.save.mockResolvedValue({
        ...mockVersion,
        status: PromptVersionStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedBy: 'user@example.com',
      });

      const result = await service.publishVersion(
        promptId,
        versionId,
        publishDto,
      );

      expect(mockVersionRepository.update).toHaveBeenCalledWith(
        { promptId, status: PromptVersionStatus.PUBLISHED },
        { status: PromptVersionStatus.ARCHIVED },
      );
      expect(result.status).toBe(PromptVersionStatus.PUBLISHED);
      expect(result.publishedBy).toBe('user@example.com');
    });
  });

  describe('extractVariables', () => {
    it('should extract variables from template', async () => {
      const dto = { template: 'Hello {{name}}, your age is {{age}}!' };

      const result = service.extractVariables(dto);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'name',
        suggestedType: 'string',
      });
      expect(result[1]).toEqual({
        name: 'age',
        suggestedType: 'string',
      });
    });
  });

  describe('previewPrompt', () => {
    it('should preview prompt with interpolated variables', async () => {
      const promptId = '1';
      const versionId = 'v1';
      const dto = { variables: { name: 'John', age: 30 } };

      const mockVersion = {
        id: versionId,
        body: 'Hello {{name}}, you are {{age}} years old!',
      };

      mockPromptRepository.findOne.mockResolvedValue({ id: promptId });
      mockVersionRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.previewPrompt(promptId, versionId, dto);

      expect(result.preview).toBe('Hello John, you are 30 years old!');
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.missingVariables).toHaveLength(0);
    });
  });
});
