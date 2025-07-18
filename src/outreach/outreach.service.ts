import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventService } from '../event/event.service';
import { PersonaService } from '../persona/persona.service';
import { CreateOutreachSequenceDto } from './dto/create-outreach-sequence.dto';
import { CreateOutreachStepTemplateDto } from './dto/create-outreach-step-template.dto';
import { UpdateOutreachSequenceDto } from './dto/update-outreach-sequence.dto';
import { UpdateOutreachStepTemplateDto } from './dto/update-outreach-step-template.dto';
import { OutreachSequence } from './entities/outreach-sequence.entity';
import { OutreachStepTemplate } from './entities/outreach-step-template.entity';
import { OutreachMessageInstance } from './entities/outreach-message-instance.entity';

@Injectable()
export class OutreachService {
  constructor(
    @InjectRepository(OutreachSequence)
    private readonly outreachSequenceRepository: Repository<OutreachSequence>,
    @InjectRepository(OutreachStepTemplate)
    private readonly outreachStepTemplateRepository: Repository<OutreachStepTemplate>,
    @InjectRepository(OutreachMessageInstance)
    private readonly outreachMessageInstanceRepository: Repository<OutreachMessageInstance>,
    private readonly eventService: EventService,
    private readonly personaService: PersonaService,
  ) {}

  async create(
    createOutreachSequenceDto: CreateOutreachSequenceDto,
  ): Promise<OutreachSequence> {
    const { event_id, ...rest } = createOutreachSequenceDto;
    let event;
    if (event_id) {
      event = await this.eventService.findOne(event_id);
    }

    const sequence = this.outreachSequenceRepository.create({ ...rest, event });
    return this.outreachSequenceRepository.save(sequence);
  }

  findAll(): Promise<OutreachSequence[]> {
    return this.outreachSequenceRepository.find({ relations: ['event'] });
  }

  async findOne(id: number): Promise<OutreachSequence> {
    const sequence = await this.outreachSequenceRepository.findOne({
      where: { id },
      relations: ['event'],
    });
    if (!sequence) {
      throw new NotFoundException(`OutreachSequence with ID ${id} not found`);
    }
    return sequence;
  }

  async update(
    id: number,
    updateOutreachSequenceDto: UpdateOutreachSequenceDto,
  ): Promise<OutreachSequence> {
    const { event_id, ...rest } = updateOutreachSequenceDto;
    const sequence = await this.findOne(id);

    let event;
    if (event_id) {
      event = await this.eventService.findOne(event_id);
    }

    const updated = this.outreachSequenceRepository.merge(sequence, {
      ...rest,
      event,
    });
    return this.outreachSequenceRepository.save(updated);
  }

  async remove(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.outreachSequenceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`OutreachSequence with ID ${id} not found`);
    }
    return { deleted: true, id };
  }

  // --- Step Template Methods ---

  async createStep(
    createOutreachStepTemplateDto: CreateOutreachStepTemplateDto,
  ): Promise<OutreachStepTemplate> {
    const { sequence_id, ...rest } = createOutreachStepTemplateDto;
    const sequence = await this.findOne(sequence_id);
    const step = this.outreachStepTemplateRepository.create({
      ...rest,
      sequence,
    });
    return this.outreachStepTemplateRepository.save(step);
  }

  findAllSteps(sequenceId: number): Promise<OutreachStepTemplate[]> {
    return this.outreachStepTemplateRepository.find({
      where: { sequence: { id: sequenceId } },
    });
  }

  async findOneStep(id: number): Promise<OutreachStepTemplate> {
    const step = await this.outreachStepTemplateRepository.findOne({
      where: { id },
    });
    if (!step) {
      throw new NotFoundException(
        `OutreachStepTemplate with ID ${id} not found`,
      );
    }
    return step;
  }

  async updateStep(
    id: number,
    updateOutreachStepTemplateDto: UpdateOutreachStepTemplateDto,
  ): Promise<OutreachStepTemplate> {
    const step = await this.findOneStep(id);
    const updated = this.outreachStepTemplateRepository.merge(
      step,
      updateOutreachStepTemplateDto,
    );
    return this.outreachStepTemplateRepository.save(updated);
  }

  async removeStep(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.outreachStepTemplateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `OutreachStepTemplate with ID ${id} not found`,
      );
    }
    return { deleted: true, id };
  }

  // --- Orchestration Methods ---

  async generateMessages(sequenceId: number) {
    const sequence = await this.findOne(sequenceId);
    const steps = await this.findAllSteps(sequenceId);
    // TODO: Implement logic to fetch target audience based on filters
    const personas = await this.personaService.findAll({}); // Placeholder

    const instances = [];
    for (const persona of personas) {
      for (const step of steps) {
        const instance = this.outreachMessageInstanceRepository.create({
          person: persona,
          sequence,
          step_template: step,
          // TODO: Render templates and call LLMs for personalization
          subject_rendered: `Subject for ${persona.full_name}`,
          body_rendered: `Body for ${persona.full_name}`,
        });
        instances.push(instance);
      }
    }

    await this.outreachMessageInstanceRepository.save(instances);
    return { generated: instances.length };
  }
}
