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
import { CreateOutreachStepTemplateDto } from './dto/create-outreach-step-template.dto';
import { UpdateOutreachSequenceDto } from './dto/update-outreach-sequence.dto';
import { UpdateOutreachStepTemplateDto } from './dto/update-outreach-step-template.dto';
import { OutreachService } from './outreach.service';

@Controller('outreach-sequences')
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Post()
  create(@Body() createOutreachSequenceDto: CreateOutreachSequenceDto) {
    return this.outreachService.create(createOutreachSequenceDto);
  }

  @Get()
  findAll() {
    return this.outreachService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.outreachService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOutreachSequenceDto: UpdateOutreachSequenceDto,
  ) {
    return this.outreachService.update(id, updateOutreachSequenceDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.outreachService.remove(id);
  }

  @Post(':id/generate-messages')
  generateMessages(@Param('id', ParseIntPipe) id: number) {
    return this.outreachService.generateMessages(id);
  }

  // --- Step Template Endpoints ---

  @Post(':sequenceId/steps')
  createStep(
    @Param('sequenceId', ParseIntPipe) sequenceId: number,
    @Body() createOutreachStepTemplateDto: CreateOutreachStepTemplateDto,
  ) {
    return this.outreachService.createStep({
      ...createOutreachStepTemplateDto,
      sequence_id: sequenceId,
    });
  }

  @Get(':sequenceId/steps')
  findAllSteps(@Param('sequenceId', ParseIntPipe) sequenceId: number) {
    return this.outreachService.findAllSteps(sequenceId);
  }

  @Get('steps/:id')
  findOneStep(@Param('id', ParseIntPipe) id: number) {
    return this.outreachService.findOneStep(id);
  }

  @Patch('steps/:id')
  updateStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOutreachStepTemplateDto: UpdateOutreachStepTemplateDto,
  ) {
    return this.outreachService.updateStep(id, updateOutreachStepTemplateDto);
  }

  @Delete('steps/:id')
  removeStep(@Param('id', ParseIntPipe) id: number) {
    return this.outreachService.removeStep(id);
  }
}
