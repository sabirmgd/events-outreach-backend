import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonaService } from '../persona/persona.service';
import { CreateOutreachSequenceDto } from './dto/create-outreach-sequence.dto';
import { UpdateOutreachSequenceDto } from './dto/update-outreach-sequence.dto';
import { OutreachSequence } from './entities/outreach-sequence.entity';
import { OutreachStepTemplate } from './entities/outreach-step-template.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateOutreachStepTemplateDto } from './dto/create-outreach-step-template.dto';
import { UpdateOutreachStepTemplateDto } from './dto/update-outreach-step-template.dto';
import { EventService } from '@event/event.service';

@Injectable()
export class OutreachService {
  constructor(
    @InjectRepository(OutreachSequence)
    private readonly outreachSequenceRepository: Repository<OutreachSequence>,
    @InjectRepository(OutreachStepTemplate)
    private readonly outreachStepTemplateRepository: Repository<OutreachStepTemplate>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly personaService: PersonaService,
    private readonly eventService: EventService,
  ) {}

  // ... (Sequence and Step Template CRUD methods remain largely the same)

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

  async initiateConversations(sequenceId: number): Promise<{ count: number }> {
    const sequence = await this.findOne(sequenceId);
    // TODO: Implement actual filtering based on sequence.company_filter_json and persona_filter_json
    const personas = await this.personaService.findAll({});

    const firstTemplate = await this.outreachStepTemplateRepository.findOne({
      where: {
        sequence: { id: sequenceId },
        applies_to_stage: 'new',
        day_offset: 0,
      },
    });

    if (!firstTemplate) {
      throw new NotFoundException(
        `No initial template (stage: 'new', day_offset: 0) found for sequence ${sequenceId}`,
      );
    }

    for (const person of personas) {
      const conversation = this.conversationRepository.create({
        person,
        sequence,
        status: 'active',
        stage: 'new',
      });
      await this.conversationRepository.save(conversation);

      // TODO: Implement template rendering (e.g., replacing {{firstName}} with person.first_name)
      const messageContent =
        firstTemplate.body_template || 'Hello from the system!';

      const message = this.messageRepository.create({
        conversation,
        sender: 'system',
        content: messageContent,
        source_template: firstTemplate,
      });
      await this.messageRepository.save(message);
    }

    return { count: personas.length };
  }

  // TODO: Add handleIncomingReply(payload) method
  // TODO: Add runAutomatedFollowUp() method
}
