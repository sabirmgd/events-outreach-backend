import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard } from '../auth/guards/casl.guard';
import { OutreachService } from './outreach.service';
import { CreateOutreachSequenceDto } from './dto/create-outreach-sequence.dto';
import { UpdateOutreachSequenceDto } from './dto/update-outreach-sequence.dto';
import { CreateOutreachStepTemplateDto } from './dto/create-outreach-step-template.dto';
import { UpdateOutreachStepTemplateDto } from './dto/update-outreach-step-template.dto';

@Controller('admin/outreach')
@UseGuards(JwtAuthGuard, CaslGuard)
export class AdminOutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  // --- Global Sequence Management ---

  @Post('sequences')
  createSequence(@Body() createOutreachSequenceDto: CreateOutreachSequenceDto) {
    return this.outreachService.create(createOutreachSequenceDto);
  }

  @Get('sequences')
  findAllSequences(@Query('signalId') signalId?: string) {
    return this.outreachService.findAll(signalId);
  }

  @Get('sequences/:id')
  findOneSequence(
    @Param('id') id: number,
    @Query('signalId') signalId?: string,
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
  removeSequence(
    @Param('id') id: number,
    @Query('signalId') signalId?: string,
  ) {
    return this.outreachService.remove(id, signalId);
  }

  // --- Global Step Management ---

  @Post('sequences/:sequenceId/steps')
  createStep(
    @Param('sequenceId') sequenceId: number,
    @Body() createOutreachStepTemplateDto: CreateOutreachStepTemplateDto,
    @Query('signalId') signalId?: string,
  ) {
    return this.outreachService.createStep(
      {
        ...createOutreachStepTemplateDto,
        sequence_id: sequenceId,
      },
      signalId,
    );
  }

  @Get('steps/:id')
  findOneStep(@Param('id') id: number, @Query('signalId') signalId?: string) {
    return this.outreachService.findOneStep(id, signalId);
  }

  @Patch('steps/:id')
  updateStep(
    @Param('id') id: number,
    @Body() updateOutreachStepTemplateDto: UpdateOutreachStepTemplateDto,
    @Query('signalId') signalId?: string,
  ) {
    return this.outreachService.updateStep(
      id,
      updateOutreachStepTemplateDto,
      signalId,
    );
  }

  @Delete('steps/:id')
  removeStep(@Param('id') id: number, @Query('signalId') signalId?: string) {
    return this.outreachService.removeStep(id, signalId);
  }
}
