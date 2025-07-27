import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateOutreachSequenceDto } from './dto/create-outreach-sequence.dto';
import { UpdateOutreachSequenceDto } from './dto/update-outreach-sequence.dto';
import { OutreachService } from './outreach.service';
import { CreateOutreachStepTemplateDto } from './dto/create-outreach-step-template.dto';

@Controller('outreach')
export class ConversationController {
  constructor(private readonly outreachService: OutreachService) {}

  // --- Sequence Endpoints ---
  @Post('sequences')
  createSequence(@Body() createOutreachSequenceDto: CreateOutreachSequenceDto) {
    return this.outreachService.create(createOutreachSequenceDto);
  }

  @Get('sequences')
  findAllSequences() {
    return this.outreachService.findAll();
  }

  @Get('sequences/:id')
  findOneSequence(@Param('id', ParseIntPipe) id: number) {
    return this.outreachService.findOne(id);
  }

  @Patch('sequences/:id')
  updateSequence(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOutreachSequenceDto: UpdateOutreachSequenceDto,
  ) {
    return this.outreachService.update(id, updateOutreachSequenceDto);
  }

  @Delete('sequences/:id')
  removeSequence(@Param('id', ParseIntPipe) id: number) {
    return this.outreachService.remove(id);
  }

  // --- Step Template Endpoints ---
  @Post('sequences/:sequenceId/steps')
  createStep(
    @Param('sequenceId', ParseIntPipe) sequenceId: number,
    @Body() createOutreachStepTemplateDto: CreateOutreachStepTemplateDto,
  ) {
    return this.outreachService.createStep({
      ...createOutreachStepTemplateDto,
      sequence_id: sequenceId,
    });
  }

  @Get('sequences/:sequenceId/steps')
  findAllSteps(@Param('sequenceId', ParseIntPipe) sequenceId: number) {
    return this.outreachService.findAllSteps(sequenceId);
  }

  // --- Orchestration Endpoints ---
  @Post('sequences/:id/initiate')
  initiateConversations(@Param('id', ParseIntPipe) id: number) {
    return this.outreachService.initiateConversations(id);
  }

  // TODO: Add endpoints for getting conversations and messages
  // TODO: Add webhook endpoint for incoming replies
}
