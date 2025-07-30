import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PromptsService } from '../services/prompts.service';
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
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/enums/permission.enum';

@Controller('prompts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @RequirePermissions(Permission.PROMPTS_CREATE)
  async create(@Body() createDto: CreatePromptDto) {
    return await this.promptsService.create(createDto);
  }

  @Get()
  @RequirePermissions(Permission.PROMPTS_READ)
  async findAll(@Query() query: QueryPromptDto) {
    return await this.promptsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PROMPTS_READ)
  async findOne(@Param('id') id: string) {
    return await this.promptsService.findOne(id);
  }

  @Get('key/:key')
  @RequirePermissions(Permission.PROMPTS_READ)
  async findByKey(@Param('key') key: string) {
    return await this.promptsService.findByKey(key);
  }

  @Put(':id')
  @RequirePermissions(Permission.PROMPTS_UPDATE)
  async update(@Param('id') id: string, @Body() updateDto: UpdatePromptDto) {
    return await this.promptsService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PROMPTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@Param('id') id: string) {
    await this.promptsService.archive(id);
  }

  @Post(':id/restore')
  @RequirePermissions(Permission.PROMPTS_UPDATE)
  async restore(@Param('id') id: string) {
    await this.promptsService.restore(id);
    return { message: 'Prompt restored successfully' };
  }

  // Version management endpoints
  @Post(':id/versions')
  @RequirePermissions(Permission.PROMPTS_UPDATE)
  async createVersion(
    @Param('id') id: string,
    @Body() createDto: CreateVersionDto,
  ) {
    return await this.promptsService.createVersion(id, createDto);
  }

  @Get(':id/versions')
  @RequirePermissions(Permission.PROMPTS_READ)
  async getVersions(@Param('id') id: string) {
    return await this.promptsService.getVersions(id);
  }

  @Get(':id/versions/:versionId')
  @RequirePermissions(Permission.PROMPTS_READ)
  async getVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return await this.promptsService.getVersion(id, versionId);
  }

  @Put(':id/versions/:versionId/publish')
  @RequirePermissions(Permission.PROMPTS_PUBLISH)
  async publishVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() publishDto: PublishVersionDto,
  ) {
    return await this.promptsService.publishVersion(id, versionId, publishDto);
  }

  @Get(':id/versions/published')
  @RequirePermissions(Permission.PROMPTS_READ)
  async getPublishedVersion(@Param('id') id: string) {
    const version = await this.promptsService.getPublishedVersion(id);
    if (!version) {
      return { message: 'No published version found' };
    }
    return version;
  }

  // Variable extraction and preview
  @Post('extract-variables')
  @RequirePermissions(Permission.PROMPTS_READ)
  extractVariables(@Body() dto: ExtractVariablesDto) {
    return this.promptsService.extractVariables(dto);
  }

  @Post(':id/versions/:versionId/preview')
  @RequirePermissions(Permission.PROMPTS_READ)
  async previewPrompt(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() dto: PreviewPromptDto,
  ) {
    return await this.promptsService.previewPrompt(id, versionId, dto);
  }

  // Tag management
  @Get('tags')
  @RequirePermissions(Permission.PROMPTS_READ)
  async getTags() {
    return await this.promptsService.getTags();
  }

  @Post('tags')
  @RequirePermissions(Permission.PROMPTS_CREATE)
  async createTag(@Body() createDto: CreatePromptTagDto) {
    return await this.promptsService.createTag(createDto);
  }

  @Post(':id/tags')
  @RequirePermissions(Permission.PROMPTS_UPDATE)
  async addTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    return await this.promptsService.addTags(id, tags);
  }

  @Delete(':id/tags')
  @RequirePermissions(Permission.PROMPTS_UPDATE)
  async removeTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    return await this.promptsService.removeTags(id, tags);
  }

  // Test case management
  @Post(':id/test-cases')
  @RequirePermissions(Permission.PROMPTS_UPDATE)
  async createTestCase(
    @Param('id') id: string,
    @Body() createDto: CreateTestCaseDto,
  ) {
    return await this.promptsService.createTestCase(id, createDto);
  }

  @Get(':id/test-cases')
  @RequirePermissions(Permission.PROMPTS_READ)
  async getTestCases(@Param('id') id: string) {
    return await this.promptsService.getTestCases(id);
  }

  @Put(':id/test-cases/:testCaseId')
  @RequirePermissions(Permission.PROMPTS_UPDATE)
  async updateTestCase(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
    @Body() updateDto: Partial<CreateTestCaseDto>,
  ) {
    return await this.promptsService.updateTestCase(id, testCaseId, updateDto);
  }

  @Delete(':id/test-cases/:testCaseId')
  @RequirePermissions(Permission.PROMPTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTestCase(
    @Param('id') id: string,
    @Param('testCaseId') testCaseId: string,
  ) {
    await this.promptsService.deleteTestCase(id, testCaseId);
  }
}
