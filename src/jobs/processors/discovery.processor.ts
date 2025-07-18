import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job as BullMQJob } from 'bullmq';
import { ToolsService } from '@tools/tools.service';
import { JobsService } from '@jobs/jobs.service';
import { ToolProvider } from '@tools/enums/tool-provider.enum';
import { Job } from '@jobs/entities/job.entity';
import { JobStatus } from '@jobs/enums/job-status.enum';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from '@event/entities/event.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

const eventSchema = z.object({
  name: z.string().describe('The name of the event.'),
  url: z.string().url().describe('The official URL of the event.'),
  startDate: z
    .string()
    .describe('The start date of the event in YYYY-MM-DD format.'),
  venue: z.string().describe('The name or address of the event venue.'),
});

const eventDiscoveryResultSchema = z.object({
  events: z.array(eventSchema).describe('An array of events found.'),
});

@Processor('discovery_queue')
export class DiscoveryProcessor extends WorkerHost {
  private readonly llm: ChatOpenAI;

  constructor(
    private readonly jobsService: JobsService,
    private readonly toolsService: ToolsService,
    private readonly configService: ConfigService,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {
    super();
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o',
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async process(job: BullMQJob<Job, any, string>): Promise<any> {
    const jobEntity = job.data;
    await this.jobsService.updateStatus(jobEntity.id, JobStatus.IN_PROGRESS);

    try {
      const tool = this.toolsService.getProvider(ToolProvider.PERPLEXITY);
      const rawOutput = await tool.execute(jobEntity);
      await this.jobsService.logOutput(jobEntity.id, rawOutput);

      const structuredOutput = await this._structureOutput(rawOutput);
      await this.jobsService.logOutput(
        jobEntity.id,
        rawOutput,
        structuredOutput,
      );

      const newEvents = await this._persistEvents(
        structuredOutput.events,
        jobEntity,
      );

      await this.jobsService.updateStatus(jobEntity.id, JobStatus.COMPLETED);
      return { status: 'COMPLETED', newEventsFound: newEvents.length };
    } catch (error) {
      console.error(`Job ${job.id} failed`, error);
      await this.jobsService.logError(jobEntity.id, (error as Error).message);
      throw error;
    }
  }

  private async _structureOutput(
    rawText: string,
  ): Promise<z.infer<typeof eventDiscoveryResultSchema>> {
    const prompt = `Please extract the event information from the following text and format it according to the schema: \n\n${rawText}`;

    // Bypass complex generic instantiation by casting to `any` before the call

    const structuredLlm: any = (this.llm as any).withStructuredOutput(
      eventDiscoveryResultSchema as any,
    );

    const result = await structuredLlm.invoke(prompt);
    return result as z.infer<typeof eventDiscoveryResultSchema>;
  }

  private async _persistEvents(
    events: z.infer<typeof eventSchema>[],
    sourceJob: Job,
  ): Promise<Event[]> {
    const newEvents: Event[] = [];
    for (const eventData of events) {
      const existingEvent = await this.eventRepository.findOneBy({
        website_url: eventData.url,
      });
      if (!existingEvent) {
        const newEvent = this.eventRepository.create({
          name: eventData.name,
          website_url: eventData.url,
          start_dt: new Date(eventData.startDate),
          // TODO: We need to figure out how to link the venue/city from the free-text venue string
          created_from_job: sourceJob,
        });
        const savedEvent = await this.eventRepository.save(newEvent);
        newEvents.push(savedEvent);
      }
    }
    return newEvents;
  }
}
