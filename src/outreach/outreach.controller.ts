import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Req,
  Patch,
  Delete,
  ForbiddenException,
} from '@nestjs/common';
import { OutreachService } from './outreach.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/dto/jwt-payload.dto';
import { CreateOutreachSequenceDto } from './dto/create-outreach-sequence.dto';
import { UpdateOutreachSequenceDto } from './dto/update-outreach-sequence.dto';
import { CreateOutreachStepTemplateDto } from './dto/create-outreach-step-template.dto';
import { UpdateOutreachStepTemplateDto } from './dto/update-outreach-step-template.dto';
import { GenerateMessagePreviewDto } from './dto/generate-message-preview.dto';

@Controller('outreach')
@UseGuards(JwtAuthGuard)
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  // --- Global Template Library Access (Read-Only) ---

  @Get('templates')
  findAllTemplates() {
    return this.outreachService.findAll(); // organizationId = null
  }

  // --- Template Cloning ---

  @Post('templates/:id/clone')
  cloneSequence(@Param('id') id: number, @Req() req: { user: JwtPayload }) {
    return this.outreachService.cloneSequence(
      id,
      req.user.organizationId ?? '',
    );
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

  // --- Organization-Scoped Sequence Management ---

  @Post('sequences')
  createSequence(
    @Body() createOutreachSequenceDto: CreateOutreachSequenceDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.outreachService.create(
      createOutreachSequenceDto,
      req.user.organizationId ?? undefined,
    );
  }

  @Get('sequences')
  findAllSequences(@Req() req: { user: JwtPayload }) {
    return this.outreachService.findAll(req.user.organizationId ?? undefined);
  }

  @Get('sequences/:id')
  findOneSequence(@Param('id') id: number, @Req() req: { user: JwtPayload }) {
    return this.outreachService.findOne(
      id,
      req.user.organizationId ?? undefined,
    );
  }

  @Patch('sequences/:id')
  updateSequence(
    @Param('id') id: number,
    @Body() updateOutreachSequenceDto: UpdateOutreachSequenceDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.outreachService.update(
      id,
      updateOutreachSequenceDto,
      req.user.organizationId ?? undefined,
    );
  }

  @Delete('sequences/:id')
  removeSequence(@Param('id') id: number, @Req() req: { user: JwtPayload }) {
    return this.outreachService.remove(
      id,
      req.user.organizationId ?? undefined,
    );
  }

  // --- Organization-Scoped Step Management ---

  @Post('sequences/:sequenceId/steps')
  createStep(
    @Param('sequenceId') sequenceId: number,
    @Body() createOutreachStepTemplateDto: CreateOutreachStepTemplateDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.outreachService.createStep(
      { ...createOutreachStepTemplateDto, sequence_id: sequenceId },
      req.user.organizationId ?? undefined,
    );
  }

  @Patch('steps/:id')
  updateStep(
    @Param('id') id: number,
    @Body() updateOutreachStepTemplateDto: UpdateOutreachStepTemplateDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.outreachService.updateStep(
      id,
      updateOutreachStepTemplateDto,
      req.user.organizationId ?? undefined,
    );
  }

  @Delete('steps/:id')
  removeStep(@Param('id') id: number, @Req() req: { user: JwtPayload }) {
    return this.outreachService.removeStep(
      id,
      req.user.organizationId ?? undefined,
    );
  }

  // --- Existing Conversation Endpoints ---

  @Post('sequences/:id/initiate')
  initiateConversations(
    @Param('id') id: number,
    @Req() req: { user: JwtPayload },
  ) {
    const { organizationId } = req.user;
    if (!organizationId) {
      throw new ForbiddenException(
        'Cannot initiate a sequence without an organization.',
      );
    }
    return this.outreachService.initiateConversations(id, organizationId);
  }

  @Post('reply')
  handleIncomingReply(@Body() payload: any) {
    // TODO: Implement reply handling
    console.log('Incoming reply:', payload);
    return { status: 'received' };
  }
}
