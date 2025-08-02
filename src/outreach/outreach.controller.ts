import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Patch,
  Delete,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOutreachSequenceDto } from './dto/create-outreach-sequence.dto';
import { UpdateOutreachSequenceDto } from './dto/update-outreach-sequence.dto';
import { CreateOutreachStepTemplateDto } from './dto/create-outreach-step-template.dto';
import { UpdateOutreachStepTemplateDto } from './dto/update-outreach-step-template.dto';
import { GenerateMessagePreviewDto } from './dto/generate-message-preview.dto';
import { InitiateSequenceDto } from './dto/initiate-sequence.dto';
import { SchedulingService } from './scheduling.service';

@Controller('outreach')
@UseGuards(JwtAuthGuard)
export class OutreachController {
  constructor(
    private readonly outreachService: OutreachService,
    private readonly schedulingService: SchedulingService,
  ) {}

  // --- Global Template Library Access (Read-Only) ---

  @Get('templates')
  findAllTemplates() {
    return this.outreachService.findAll(); // signalId = null
  }

  // --- Template Cloning ---

  @Post('templates/:id/clone')
  cloneSequence(@Param('id') id: number, @Query('signalId') signalId: string) {
    return this.outreachService.cloneSequence(id, signalId);
  }

  // --- AI Message Generation for Preview ---

  @Post('generate-preview')
  generateMessagePreview(
    @Body() generateMessagePreviewDto: GenerateMessagePreviewDto,
  ) {
    return this.outreachService.generateMessagePreview(
      generateMessagePreviewDto,
    );
  }

  // --- Signal-Scoped Sequence Management ---

  @Post('sequences')
  createSequence(@Body() createOutreachSequenceDto: CreateOutreachSequenceDto) {
    return this.outreachService.create(createOutreachSequenceDto);
  }

  @Get('sequences')
  findAllSequences(@Query('signalId') signalId: string) {
    return this.outreachService.findAll(signalId);
  }

  @Get('sequences/:id')
  findOneSequence(
    @Param('id') id: number,
    @Query('signalId') signalId: string,
  ) {
    return this.outreachService.findOne(id, signalId);
  }

  @Patch('sequences/:id')
  updateSequence(
    @Param('id') id: number,
    @Body() updateOutreachSequenceDto: UpdateOutreachSequenceDto,
  ) {
    return this.outreachService.update(id, updateOutreachSequenceDto);
  }

  @Delete('sequences/:id')
  removeSequence(@Param('id') id: number, @Query('signalId') signalId: string) {
    return this.outreachService.remove(id, signalId);
  }

  // --- Signal-Scoped Step Management ---

  @Post('sequences/:sequenceId/steps')
  createStep(
    @Param('sequenceId') sequenceId: number,
    @Body() createOutreachStepTemplateDto: CreateOutreachStepTemplateDto,
    @Query('signalId') signalId: string,
  ) {
    return this.outreachService.createStep(
      { ...createOutreachStepTemplateDto, sequence_id: sequenceId },
      signalId,
    );
  }

  @Patch('steps/:id')
  updateStep(
    @Param('id') id: number,
    @Body() updateOutreachStepTemplateDto: UpdateOutreachStepTemplateDto,
    @Query('signalId') signalId: string,
  ) {
    return this.outreachService.updateStep(
      id,
      updateOutreachStepTemplateDto,
      signalId,
    );
  }

  @Delete('steps/:id')
  removeStep(@Param('id') id: number, @Query('signalId') signalId: string) {
    return this.outreachService.removeStep(id, signalId);
  }

  // --- Existing Conversation Endpoints ---

  @Post('sequences/:id/initiate')
  initiateConversations(
    @Param('id') id: number,
    @Query('signalId') signalId: string,
  ) {
    if (!signalId) {
      throw new ForbiddenException(
        'Cannot initiate a sequence without a signal.',
      );
    }
    return this.outreachService.initiateConversations(id, signalId);
  }

  @Post('reply')
  handleIncomingReply(@Body() payload: any) {
    // TODO: Implement reply handling
    console.log('Incoming reply:', payload);
    return { status: 'received' };
  }

  // --- Testing Endpoints ---

  @Post('test/initiate-sequence')
  async initiateSequenceTest(@Body() dto: InitiateSequenceDto) {
    return this.outreachService.initiateSequenceForPersons(dto);
  }

  @Delete('test/scheduled-actions')
  async deleteAllScheduledActions() {
    return this.outreachService.deleteAllScheduledActions();
  }

  @Get('test/scheduled-actions')
  async getScheduledActions(@Query('organizationId') organizationId?: string) {
    return this.outreachService.getScheduledActions(organizationId);
  }

  @Post('test/process-immediately/:organizationId')
  async processImmediately(@Param('organizationId') organizationId: string) {
    // Force the cron job to run immediately for testing
    await this.schedulingService.enqueueDueActions();
    return {
      message: 'Processing initiated for organization ' + organizationId,
    };
  }
}
