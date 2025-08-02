import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { PersonaService } from '../persona/persona.service';
import { CreateOutreachSequenceDto } from './dto/create-outreach-sequence.dto';
import { UpdateOutreachSequenceDto } from './dto/update-outreach-sequence.dto';
import { OutreachSequence } from './entities/outreach-sequence.entity';
import { OutreachStepTemplate } from './entities/outreach-step-template.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateOutreachStepTemplateDto } from './dto/create-outreach-step-template.dto';
import { UpdateOutreachStepTemplateDto } from './dto/update-outreach-step-template.dto';
import { EventService } from '../event/event.service';
import { HandleReplyDto } from './dto/handle-reply.dto';
import { ConversationStage } from './enums/conversation-stage.enum';
import { ConversationAutomationStatus } from './enums/conversation-automation-status.enum';
import { z } from 'zod';
import { ConfigService } from '@nestjs/config';
import { GenerateMessagePreviewDto } from './dto/generate-message-preview.dto';
import { SignalService } from '../signal/signal.service';
import { ChatAnthropic } from '@langchain/anthropic';
import { ScheduledAction } from './entities/scheduled-action.entity';
import { ScheduledActionStatus } from './enums/scheduled-action-status.enum';
import { ScheduledActionChannel } from './enums/scheduled-action-channel.enum';
import { ScheduledActionType } from './enums/scheduled-action-type.enum';
import { InitiateSequenceDto } from './dto/initiate-sequence.dto';
import { EmailSender } from '../organization/entities/email-sender.entity';
import { Person } from '../persona/entities/person.entity';

@Injectable()
export class OutreachService {
  private readonly llm: ChatAnthropic;

  constructor(
    @InjectRepository(OutreachSequence)
    private readonly outreachSequenceRepository: Repository<OutreachSequence>,
    @InjectRepository(OutreachStepTemplate)
    private readonly outreachStepTemplateRepository: Repository<OutreachStepTemplate>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ScheduledAction)
    private readonly scheduledActionRepository: Repository<ScheduledAction>,
    @InjectRepository(EmailSender)
    private readonly emailSenderRepository: Repository<EmailSender>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly personaService: PersonaService,
    private readonly eventService: EventService,
    private readonly signalService: SignalService,
    private readonly configService: ConfigService,
  ) {
    this.llm = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20240620',
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  // ... (Sequence and Step Template CRUD methods remain largely the same)

  async create(
    createOutreachSequenceDto: CreateOutreachSequenceDto,
  ): Promise<OutreachSequence> {
    const { event_id, signalId, ...rest } = createOutreachSequenceDto;
    let event;
    if (event_id) {
      event = await this.eventService.findOne(event_id);
    }
    const signal = await this.signalService.findOne(signalId);

    const sequence = this.outreachSequenceRepository.create({
      ...rest,
      event,
      signal,
    });
    return this.outreachSequenceRepository.save(sequence);
  }

  findAll(signalId?: string): Promise<OutreachSequence[]> {
    const where = signalId
      ? { signal: { id: signalId } }
      : { signal: IsNull() };
    return this.outreachSequenceRepository.find({
      where,
      relations: ['event', 'signal'],
    });
  }

  async findOne(id: number, signalId?: string): Promise<OutreachSequence> {
    const where = signalId
      ? { id, signal: { id: signalId } }
      : { id, signal: IsNull() };

    const sequence = await this.outreachSequenceRepository.findOne({
      where,
      relations: ['event', 'steps', 'signal'],
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
    const { event_id, signalId, ...rest } = updateOutreachSequenceDto;
    const sequence = await this.findOne(id, signalId);

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
    signalId?: string,
  ): Promise<{ deleted: boolean; id?: number }> {
    const where = signalId
      ? { id, signal: { id: signalId } }
      : { id, signal: IsNull() };
    const result = await this.outreachSequenceRepository.delete(where);
    if (result.affected === 0) {
      throw new NotFoundException(`OutreachSequence with ID ${id} not found`);
    }
    return { deleted: true, id };
  }

  // --- Template Cloning ---

  async cloneSequence(
    templateId: number,
    signalId: string,
  ): Promise<OutreachSequence> {
    if (!signalId) {
      throw new Error('Cloning requires a valid signalId.');
    }

    // 1. Find the global template
    const template = await this.findOne(templateId, undefined); // 'undefined' ensures we find a global one
    if (template.signal) {
      throw new Error(
        'Cannot clone a sequence that already belongs to a signal.',
      );
    }

    // 2. Create a shallow copy of the sequence for the new signal
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...restOfTemplate } = template;
    const newSequence = await this.create({
      ...restOfTemplate,
      name: `${template.name} (Copy)`, // Append to the name to signify it's a copy
      signalId,
    });

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
        signalId,
      );
    }

    return this.findOne(newSequence.id, signalId);
  }

  // --- Step Management ---

  async createStep(
    createOutreachStepTemplateDto: CreateOutreachStepTemplateDto,
    signalId?: string,
  ): Promise<OutreachStepTemplate> {
    const { sequence_id, ...rest } = createOutreachStepTemplateDto;
    const sequence = await this.findOne(sequence_id, signalId);
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
    signalId?: string,
  ): Promise<OutreachStepTemplate> {
    const step = await this.outreachStepTemplateRepository.findOne({
      where: {
        id,
        sequence: { signal: { id: signalId || undefined } },
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
    signalId?: string,
  ): Promise<OutreachStepTemplate> {
    const step = await this.findOneStep(id, signalId);
    const updated = this.outreachStepTemplateRepository.merge(
      step,
      updateOutreachStepTemplateDto,
    );
    return this.outreachStepTemplateRepository.save(updated);
  }

  async removeStep(
    id: number,
    signalId?: string,
  ): Promise<{ deleted: boolean; id?: number }> {
    const step = await this.findOneStep(id, signalId);
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
    signalId: string,
  ): Promise<{ count: number }> {
    const sequence = await this.findOne(sequenceId, signalId);

    // TODO: Use discovery_prompt to find personas instead of getting all
    // For now, get all personas from the same organization as the signal
    const signal = await this.signalService.findOne(signalId);
    const personasResult = await this.personaService.findAll(
      {},
      signal.organizationId,
    );

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
    for (const person of personasResult.data) {
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
      `- Day ${s.day} (${s.channel}): ${
        s.subject ? `Subject: ${s.subject} - ` : ''
      }Body: ${s.body}`,
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

    const yourIdentityContext =
      Object.keys(yourVariables).length > 0
        ? `
---
SENDER CONTEXT
This is the information about the person sending the message. Use this to inform the tone and signature.
${Object.entries(yourVariables)
  .map(([key, value]) => `- ${key.replace(/{{|}}/g, '')}: ${value}`)
  .join('\n')}
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
${
  dto.channel === 'linkedin_conn'
    ? '- Keep the message under 300 characters for LinkedIn connection requests.'
    : ''
}`;

    try {
      // Use structured output with LangChain
      const structuredLlm = this.llm.withStructuredOutput(
        messageSchema as any,
      ) as any;
      const result = await structuredLlm.invoke(prompt);

      return result;
    } catch (error) {
      throw new Error(
        `Failed to generate message preview: ${(error as Error).message}`,
      );
    }
  }

  // TODO: Add runAutomatedFollowUp() method

  // Testing methods for queue system
  async initiateSequenceForPersons(dto: InitiateSequenceDto) {
    const { signalId, sequenceId, personIds, sendImmediately } = dto;

    // Get the sequence and its steps
    const sequence = await this.outreachSequenceRepository.findOne({
      where: { id: parseInt(sequenceId) },
      relations: ['steps'],
    });

    if (!sequence) {
      throw new NotFoundException('Sequence not found');
    }

    // Get the signal
    const signal = await this.signalService.findOne(signalId);
    if (!signal) {
      throw new NotFoundException('Signal not found');
    }

    // Get persons
    const persons = await this.personRepository.find({
      where: { id: In(personIds) },
      relations: ['organization'],
    });

    if (persons.length === 0) {
      throw new NotFoundException('No persons found');
    }

    // Get the first email sender for the organization
    const emailSender = await this.emailSenderRepository.findOne({
      where: { organization: { id: persons[0].organization.id } },
    });

    if (!emailSender) {
      throw new NotFoundException(
        'No email sender configured for organization',
      );
    }

    const createdConversations = [];

    // Create conversations and scheduled actions for each person
    for (const person of persons) {
      // Create or get existing conversation
      let conversation = await this.conversationRepository.findOne({
        where: {
          person: { id: person.id },
          sequence: { id: sequence.id },
        },
        relations: ['person', 'sequence'],
      });

      if (!conversation) {
        conversation = this.conversationRepository.create({
          person,
          sequence,
          stage: ConversationStage.NEW,
          automation_status: ConversationAutomationStatus.ACTIVE,
          current_step: sequence.steps[0],
        });
        await this.conversationRepository.save(conversation);
      }

      // Get the first step
      const firstStep = sequence.steps.sort(
        (a, b) => a.day_offset - b.day_offset,
      )[0];

      if (firstStep) {
        // Create scheduled action
        const scheduledAt = sendImmediately ? new Date() : new Date();
        if (!sendImmediately) {
          scheduledAt.setDate(scheduledAt.getDate() + firstStep.day_offset);
        }

        const scheduledAction = this.scheduledActionRepository.create({
          conversation,
          step: firstStep,
          channel:
            firstStep.channel === 'email'
              ? ScheduledActionChannel.EMAIL
              : ScheduledActionChannel.LINKEDIN,
          action_type: ScheduledActionType.SEND_MESSAGE,
          scheduled_at: scheduledAt,
          status: ScheduledActionStatus.PENDING,
          email_sender: firstStep.channel === 'email' ? emailSender : undefined,
        });

        await this.scheduledActionRepository.save(scheduledAction);
      }

      createdConversations.push(conversation);
    }

    return {
      message: `Created ${createdConversations.length} conversations with scheduled actions`,
      conversations: createdConversations.map((c) => ({
        id: c.id,
        personName: c.person.full_name,
        stage: c.stage,
        status: c.automation_status,
      })),
    };
  }

  async deleteAllScheduledActions() {
    const result = await this.scheduledActionRepository.delete({
      status: In([
        ScheduledActionStatus.PENDING,
        ScheduledActionStatus.PROCESSING,
      ]),
    });

    return {
      message: `Deleted ${result.affected} scheduled actions`,
    };
  }

  async getScheduledActions(organizationId?: string) {
    const query = this.scheduledActionRepository
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.conversation', 'conversation')
      .leftJoinAndSelect('conversation.person', 'person')
      .leftJoinAndSelect('person.organization', 'organization')
      .leftJoinAndSelect('action.step', 'step')
      .leftJoinAndSelect('action.email_sender', 'email_sender')
      .orderBy('action.scheduled_at', 'ASC');

    if (organizationId) {
      query.where('organization.id = :organizationId', { organizationId });
    }

    const actions = await query.getMany();

    return actions.map((action) => ({
      id: action.id,
      status: action.status,
      channel: action.channel,
      scheduledAt: action.scheduled_at,
      personName: action.conversation.person.full_name,
      personEmail: action.conversation.person.email,
      organizationId: action.conversation.person.organization?.id,
      stepSubject: action.step.subject_template,
      bullJobId: action.bull_job_id,
    }));
  }
}
