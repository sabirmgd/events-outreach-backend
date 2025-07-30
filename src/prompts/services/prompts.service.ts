import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt, PromptType } from '../entities/prompt.entity';
import {
  PromptVersion,
  PromptVersionStatus,
} from '../entities/prompt-version.entity';
import { PromptTag } from '../entities/prompt-tag.entity';
import { PromptTestCase } from '../entities/prompt-test-case.entity';
import {
  CreatePromptDto,
  UpdatePromptDto,
  QueryPromptDto,
  CreateVersionDto,
  PublishVersionDto,
  PreviewPromptDto,
  ExtractVariablesDto,
  CreatePromptTagDto,
  CreateTestCaseDto,
} from '../dto';
import { VariableExtractor } from '../utils/variable-extractor';

@Injectable()
export class PromptsService {
  constructor(
    @InjectRepository(Prompt)
    private promptRepository: Repository<Prompt>,
    @InjectRepository(PromptVersion)
    private versionRepository: Repository<PromptVersion>,
    @InjectRepository(PromptTag)
    private tagRepository: Repository<PromptTag>,
    @InjectRepository(PromptTestCase)
    private testCaseRepository: Repository<PromptTestCase>,
  ) {}

  async create(createDto: CreatePromptDto): Promise<Prompt> {
    // Check if prompt with key already exists
    const existing = await this.promptRepository.findOne({
      where: { key: createDto.key },
    });

    if (existing) {
      throw new ConflictException(
        `Prompt with key '${createDto.key}' already exists`,
      );
    }

    // Extract variables from the body
    const extractedVariables = VariableExtractor.extractVariables(
      createDto.body,
    );
    const variables = createDto.variables || {};

    // Merge extracted variables with provided ones
    extractedVariables.forEach((v) => {
      if (!variables[v.name]) {
        variables[v.name] = {
          type: v.suggestedType,
          required: true,
        };
      }
    });

    // Create prompt
    const prompt = this.promptRepository.create({
      ...createDto,
      variables,
      type: createDto.type || PromptType.SYSTEM,
      isArchived: createDto.isArchived || false,
    });

    const savedPrompt = await this.promptRepository.save(prompt);

    // Create initial version
    const version = this.versionRepository.create({
      promptId: savedPrompt.id,
      version: 1,
      body: createDto.body,
      status: PromptVersionStatus.DRAFT,
      changelog: createDto.changelog || 'Initial version',
      metadata: createDto.metadata,
    });

    await this.versionRepository.save(version);

    return this.findOne(savedPrompt.id);
  }

  async findAll(query: QueryPromptDto): Promise<{
    data: Prompt[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.promptRepository
      .createQueryBuilder('prompt')
      .leftJoinAndSelect('prompt.versions', 'versions')
      .leftJoinAndSelect('prompt.tags', 'tags')
      .where('prompt.isArchived = :isArchived', {
        isArchived: filters.isArchived || false,
      });

    if (filters.namespace) {
      queryBuilder.andWhere('prompt.namespace = :namespace', {
        namespace: filters.namespace,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('prompt.type = :type', { type: filters.type });
    }

    if (filters.agentId) {
      queryBuilder.andWhere('prompt.agentId = :agentId', {
        agentId: filters.agentId,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(prompt.name ILIKE :search OR prompt.description ILIKE :search OR prompt.key ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.tag) {
      queryBuilder.andWhere('tags.name = :tag', { tag: filters.tag });
    }

    if (filters.status) {
      queryBuilder.andWhere('versions.status = :status', {
        status: filters.status,
      });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Prompt> {
    const prompt = await this.promptRepository.findOne({
      where: { id },
      relations: ['versions', 'tags', 'testCases'],
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID '${id}' not found`);
    }

    return prompt;
  }

  async findByKey(key: string): Promise<Prompt> {
    const prompt = await this.promptRepository.findOne({
      where: { key },
      relations: ['versions', 'tags', 'testCases'],
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with key '${key}' not found`);
    }

    return prompt;
  }

  async update(id: string, updateDto: UpdatePromptDto): Promise<Prompt> {
    const prompt = await this.findOne(id);

    Object.assign(prompt, updateDto);
    await this.promptRepository.save(prompt);

    return this.findOne(id);
  }

  async archive(id: string): Promise<void> {
    const prompt = await this.findOne(id);
    prompt.isArchived = true;
    await this.promptRepository.save(prompt);
  }

  async restore(id: string): Promise<void> {
    const prompt = await this.findOne(id);
    prompt.isArchived = false;
    await this.promptRepository.save(prompt);
  }

  // Version management
  async createVersion(
    promptId: string,
    createDto: CreateVersionDto,
  ): Promise<PromptVersion> {
    await this.findOne(promptId); // Verify prompt exists

    // Get latest version number
    const latestVersion = await this.versionRepository.findOne({
      where: { promptId },
      order: { version: 'DESC' },
    });

    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    const version = this.versionRepository.create({
      promptId,
      version: newVersionNumber,
      body: createDto.body,
      status: PromptVersionStatus.DRAFT,
      changelog: createDto.changelog,
      metadata: createDto.metadata,
    });

    return await this.versionRepository.save(version);
  }

  async getVersions(promptId: string): Promise<PromptVersion[]> {
    await this.findOne(promptId); // Ensure prompt exists

    return await this.versionRepository.find({
      where: { promptId },
      order: { version: 'DESC' },
    });
  }

  async getVersion(
    promptId: string,
    versionId: string,
  ): Promise<PromptVersion> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId, promptId },
    });

    if (!version) {
      throw new NotFoundException(
        `Version '${versionId}' not found for prompt '${promptId}'`,
      );
    }

    return version;
  }

  async publishVersion(
    promptId: string,
    versionId: string,
    publishDto: PublishVersionDto,
  ): Promise<PromptVersion> {
    await this.findOne(promptId); // Ensure prompt exists
    const version = await this.getVersion(promptId, versionId);

    if (version.status === PromptVersionStatus.PUBLISHED) {
      throw new BadRequestException('Version is already published');
    }

    // Unpublish any currently published version
    await this.versionRepository.update(
      { promptId, status: PromptVersionStatus.PUBLISHED },
      { status: PromptVersionStatus.ARCHIVED },
    );

    // Publish the new version
    version.status = PromptVersionStatus.PUBLISHED;
    version.publishedAt = new Date();
    version.publishedBy = publishDto.publishedBy || 'system';

    return await this.versionRepository.save(version);
  }

  async getPublishedVersion(promptId: string): Promise<PromptVersion | null> {
    return await this.versionRepository.findOne({
      where: { promptId, status: PromptVersionStatus.PUBLISHED },
    });
  }

  // Variable management
  extractVariables(dto: ExtractVariablesDto) {
    return VariableExtractor.extractVariables(dto.template);
  }

  async previewPrompt(
    promptId: string,
    versionId: string,
    dto: PreviewPromptDto,
  ) {
    const version = await this.getVersion(promptId, versionId);
    return VariableExtractor.previewPrompt(version.body, dto.variables || {});
  }

  // Tag management
  async createTag(createDto: CreatePromptTagDto): Promise<PromptTag> {
    const existing = await this.tagRepository.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(`Tag '${createDto.name}' already exists`);
    }

    const tag = this.tagRepository.create(createDto);
    return await this.tagRepository.save(tag);
  }

  async getTags(): Promise<PromptTag[]> {
    return await this.tagRepository.find({
      order: { name: 'ASC' },
    });
  }

  async addTags(promptId: string, tagNames: string[]): Promise<Prompt> {
    const prompt = await this.findOne(promptId);

    const tags = await Promise.all(
      tagNames.map(async (name) => {
        let tag = await this.tagRepository.findOne({ where: { name } });
        if (!tag) {
          tag = await this.createTag({ name });
        }
        return tag;
      }),
    );

    prompt.tags = [...prompt.tags, ...tags];
    await this.promptRepository.save(prompt);

    return this.findOne(promptId);
  }

  async removeTags(promptId: string, tagNames: string[]): Promise<Prompt> {
    const prompt = await this.findOne(promptId);

    prompt.tags = prompt.tags.filter((tag) => !tagNames.includes(tag.name));
    await this.promptRepository.save(prompt);

    return this.findOne(promptId);
  }

  // Test case management
  async createTestCase(
    promptId: string,
    createDto: CreateTestCaseDto,
  ): Promise<PromptTestCase> {
    await this.findOne(promptId); // Ensure prompt exists

    const testCase = this.testCaseRepository.create({
      ...createDto,
      promptId,
    });

    return await this.testCaseRepository.save(testCase);
  }

  async getTestCases(promptId: string): Promise<PromptTestCase[]> {
    await this.findOne(promptId); // Ensure prompt exists

    return await this.testCaseRepository.find({
      where: { promptId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateTestCase(
    promptId: string,
    testCaseId: string,
    updateDto: Partial<CreateTestCaseDto>,
  ): Promise<PromptTestCase> {
    const testCase = await this.testCaseRepository.findOne({
      where: { id: testCaseId, promptId },
    });

    if (!testCase) {
      throw new NotFoundException(`Test case '${testCaseId}' not found`);
    }

    Object.assign(testCase, updateDto);
    return await this.testCaseRepository.save(testCase);
  }

  async deleteTestCase(promptId: string, testCaseId: string): Promise<void> {
    const testCase = await this.testCaseRepository.findOne({
      where: { id: testCaseId, promptId },
    });

    if (!testCase) {
      throw new NotFoundException(`Test case '${testCaseId}' not found`);
    }

    testCase.isActive = false;
    await this.testCaseRepository.save(testCase);
  }
}
