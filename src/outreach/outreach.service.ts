import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
import { HandleReplyDto } from './dto/handle-reply.dto';
import { ConversationStage } from './enums/conversation-stage.enum';
import { ConversationAutomationStatus } from './enums/conversation-automation-status.enum';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { ConfigService } from '@nestjs/config';
import { GenerateMessagePreviewDto } from './dto/generate-message-preview.dto';

type OrgId = string | undefined;

@Injectable()
export class OutreachService {
  private readonly llm: ChatOpenAI;

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
    private readonly configService: ConfigService,
  ) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o',
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // ... (Sequence and Step Template CRUD methods remain largely the same)

  async create(
    createOutreachSequenceDto: CreateOutreachSequenceDto,
    organizationId?: OrgId,
  ): Promise<OutreachSequence> {
    const { event_id, ...rest } = createOutreachSequenceDto;
    let event;
    if (event_id) {
      event = await this.eventService.findOne(event_id);
    }

    const sequence = this.outreachSequenceRepository.create({
      ...rest,
      event,
      ...(organizationId ? { organization: { id: organizationId } } : {}),
    });
    return this.outreachSequenceRepository.save(sequence);
  }

  findAll(organizationId?: OrgId): Promise<OutreachSequence[]> {
    const where = organizationId
      ? { organization: { id: organizationId } }
      : { organization: IsNull() };
    return this.outreachSequenceRepository.find({
      where,
      relations: ['event'],
    });
  }

  async findOne(id: number, organizationId?: OrgId): Promise<OutreachSequence> {
    const where = organizationId
      ? { id, organization: { id: organizationId } }
      : { id, organization: IsNull() };

    const sequence = await this.outreachSequenceRepository.findOne({
      where,
      relations: ['event', 'steps'],
    });
    if (!sequence) {
      throw new NotFoundException(`OutreachSequence with ID ${id} not found`);
    }
    return sequence;
  }

  async update(
    id: number,
    updateOutreachSequenceDto: UpdateOutreachSequenceDto,
    organizationId?: OrgId,
  ): Promise<OutreachSequence> {
    const { event_id, ...rest } = updateOutreachSequenceDto;
    const sequence = await this.findOne(id, organizationId);

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

  async remove(
    id: number,
    organizationId?: OrgId,
  ): Promise<{ deleted: boolean; id?: number }> {
    const where = organizationId
      ? { id, organization: { id: organizationId } }
      : { id, organization: IsNull() };
    const result = await this.outreachSequenceRepository.delete(where);
    if (result.affected === 0) {
      throw new NotFoundException(`OutreachSequence with ID ${id} not found`);
    }
    return { deleted: true, id };
  }

  // --- Template Cloning ---

  async cloneSequence(
    templateId: number,
    organizationId: string,
  ): Promise<OutreachSequence> {
    if (!organizationId) {
      throw new Error('Cloning requires a valid organizationId.');
    }

    // 1. Find the global template
    const template = await this.findOne(templateId, undefined); // 'undefined' ensures we find a global one
    if (template.organization) {
      throw new Error(
        'Cannot clone a sequence that already belongs to an organization.',
      );
    }

    // 2. Create a shallow copy of the sequence for the new organization
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...restOfTemplate } = template;
    const newSequence = await this.create(
      {
        ...restOfTemplate,
        name: `${template.name} (Copy)`, // Append to the name to signify it's a copy
      },
      organizationId,
    );

    // 3. Find and deep copy all steps associated with the original template
    const templateSteps = await this.findAllSteps(template.id);
    for (const step of templateSteps) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: stepId, sequence, ...restOfStep } = step;

      await this.createStep(
        {
          ...restOfStep,
          sequence_id: newSequence.id,
        },
        organizationId,
      );
    }

    return this.findOne(newSequence.id, organizationId);
  }

  // --- Step Management ---

  async createStep(
    createOutreachStepTemplateDto: CreateOutreachStepTemplateDto,
    organizationId?: OrgId,
  ): Promise<OutreachStepTemplate> {
    const { sequence_id, ...rest } = createOutreachStepTemplateDto;
    const sequence = await this.findOne(sequence_id, organizationId);
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

  async findOneStep(
    id: number,
    organizationId?: OrgId,
  ): Promise<OutreachStepTemplate> {
    const step = await this.outreachStepTemplateRepository.findOne({
      where: {
        id,
        sequence: { organization: { id: organizationId || undefined } },
      },
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
    organizationId: OrgId,
  ): Promise<OutreachStepTemplate> {
    const step = await this.findOneStep(id, organizationId);
    const updated = this.outreachStepTemplateRepository.merge(
      step,
      updateOutreachStepTemplateDto,
    );
    return this.outreachStepTemplateRepository.save(updated);
  }

  async removeStep(
    id: number,
    organizationId: OrgId,
  ): Promise<{ deleted: boolean; id?: number }> {
    const step = await this.findOneStep(id, organizationId);
    const result = await this.outreachStepTemplateRepository.delete(step.id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `OutreachStepTemplate with ID ${id} not found`,
      );
    }
    return { deleted: true, id };
  }

  // --- Orchestration Methods ---

  async initiateConversations(
    sequenceId: number,
    organizationId: string,
  ): Promise<{ count: number }> {
    const sequence = await this.findOne(sequenceId, organizationId);

    // TODO: Use discovery_prompt to find personas instead of getting all
    const personas = await this.personaService.findAll({});

    // Find the first step (lowest day_offset)
    const firstStep = await this.outreachStepTemplateRepository.findOne({
      where: {
        sequence: { id: sequenceId },
      },
      order: {
        day_offset: 'ASC',
      },
    });

    if (!firstStep) {
      throw new NotFoundException(`No steps found for sequence ${sequenceId}`);
    }

    const conversations = [];
    for (const person of personas) {
      const conversation = this.conversationRepository.create({
        person,
        sequence,
        automation_status: ConversationAutomationStatus.ACTIVE,
        stage: ConversationStage.NEW,
        current_step: firstStep,
        next_action_at: new Date(), // Execute immediately for day_offset 0
      });

      // If the first step has a delay, calculate the future date
      if (firstStep.day_offset > 0) {
        const nextActionDate = new Date();
        nextActionDate.setDate(nextActionDate.getDate() + firstStep.day_offset);
        conversation.next_action_at = nextActionDate;
      }

      conversations.push(await this.conversationRepository.save(conversation));
    }

    return { count: conversations.length };
  }

  async handleIncomingReply(payload: HandleReplyDto): Promise<Conversation> {
    const { conversationId, messageContent } = payload;
    const conversation = await this.conversationRepository.findOneBy({
      id: conversationId,
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    // 1. Create a new message from the contact
    const message = this.messageRepository.create({
      conversation,
      sender: 'contact', // Or 'user' depending on your sender definitions
      content: messageContent,
    });
    await this.messageRepository.save(message);

    // 2. Update the conversation stage and pause automation
    conversation.stage = ConversationStage.RESPONDED;
    conversation.automation_status = ConversationAutomationStatus.NEEDS_REVIEW;
    conversation.next_action_at = null; // Stop any pending actions

    return this.conversationRepository.save(conversation);
  }

  async generateMessagePreview(
    dto: GenerateMessagePreviewDto,
  ): Promise<{ subject: string; body: string }> {
    // Define the schema for structured output
    const messageSchema = z.object({
      subject: z.string().describe('The email subject line'),
      body: z.string().describe('The email body content'),
    });

    // Construct the prompt based on the channel and context
    const channelContext =
      dto.channel === 'email'
        ? 'email'
        : dto.channel === 'linkedin_conn'
          ? 'LinkedIn connection request'
          : 'LinkedIn message';

    const previousStepsContext = dto.previous_steps?.length
      ? `
Here is the history of the conversation so far:
${dto.previous_steps
  .map(
    (s) =>
      `- Day ${s.day} (${s.channel}): ${s.subject ? `Subject: ${s.subject} - ` : ''}Body: ${s.body}`,
  )
  .join('\n')}
`
      : '';

    // Separate variables into "your" identity and "contact" placeholders
    const yourVariables: Record<string, string> = {};
    const contactPlaceholders: string[] = [];
    if (dto.template_variables) {
      for (const key in dto.template_variables) {
        if (key.startsWith('{{your') && dto.template_variables[key]) {
          yourVariables[key] = dto.template_variables[key];
        } else if (!key.startsWith('{{your')) {
          contactPlaceholders.push(key);
        }
      }
    }

    const yourIdentityContext = Object.keys(yourVariables).length > 0
    ? `
---
SENDER CONTEXT
This is the information about the person sending the message. Use this to inform the tone and signature.
${Object.entries(yourVariables).map(([key, value]) => `- ${key.replace(/{{|}}/g, '')}: ${value}`).join('\n')}
---
`
    : '';

    const placeholderInstruction = `
---
PLACEHOLDER RULES
You MUST use the following placeholders for recipient-specific details. Do not replace them with example values.
- Allowed Placeholders: ${contactPlaceholders.join(', ')}
- Example of CORRECT usage: "Hi {{firstName}}, I saw that {{companyName}} is..."
- Example of INCORRECT usage: "Hi John, I saw that Acme Corp is..."
---
`;

    const lengthInstruction = dto.message_length
      ? `\n- The message should be ${dto.message_length} in length.`
      : '';

    const prompt = `You are an expert copywriter tasked with creating a reusable outreach TEMPLATE.

Your Goal: Write a compelling message that can be used for many different recipients by using placeholders.
${yourIdentityContext}

Company Value Proposition: "${dto.outreach_context}"
${previousStepsContext}
Your Task:
Write a compelling ${channelContext} template for day ${dto.day_offset} of an outreach sequence.
${placeholderInstruction}

Additional Guidelines:
- The message should be ${dto.message_length || 'medium'} in length.
- Be concise and professional.
- Focus on value, not features.
- Include a clear call to action.
${dto.channel === 'linkedin_conn' ? '- Keep the message under 300 characters for LinkedIn connection requests.' : ''}`;

    try {
      // Use structured output with LangChain
      const structuredLlm = this.llm.withStructuredOutput(
        messageSchema as any,
      ) as any;
      const result = await structuredLlm.invoke(prompt);

      return result as { subject: string; body: string };
    } catch (error) {
      throw new Error(
        `Failed to generate message preview: ${(error as Error).message}`,
      );
    }
  }

  // TODO: Add runAutomatedFollowUp() method
}
