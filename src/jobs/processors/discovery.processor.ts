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
import { City } from '@geography/entities/city.entity';
import { Logger } from '@nestjs/common';
import { DISCOVERY_QUEUE } from '@queue/constants';

const eventSchema = z.object({
  name: z.string().describe('The name of the event.'),
  url: z
    .string()
    .describe('The official URL of the event. Must be a valid URL format.'),
  startDate: z
    .string()
    .describe('The start date of the event in YYYY-MM-DD format.'),
  endDate: z
    .string()
    .nullable()
    .describe(
      'The end date of the event in YYYY-MM-DD format. May be null if not available.',
    ),
  venue: z.string().describe('The name or address of the event venue.'),
});

const eventDiscoveryResultSchema = z.object({
  events: z.array(eventSchema).describe('An array of events found.'),
});

@Processor(DISCOVERY_QUEUE)
export class DiscoveryProcessor extends WorkerHost {
  private readonly llm: ChatOpenAI;
  private readonly logger = new Logger(DiscoveryProcessor.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly toolsService: ToolsService,
    private readonly configService: ConfigService,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {
    super();
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o',
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async process(job: BullMQJob<Job, any, string>): Promise<any> {
    const jobEntity = job.data;
    this.logger.log(
      `[${jobEntity.id}] Starting processing for job of type ${jobEntity.type}`,
    );
    await this.jobsService.updateStatus(jobEntity.id, JobStatus.IN_PROGRESS);

    try {
      const providerKey =
        (jobEntity.inputParameters as any)?.provider ?? ToolProvider.PERPLEXITY;
      this.logger.log(`[${jobEntity.id}] Using tool provider: ${providerKey}`);
      const tool = this.toolsService.getProvider(providerKey as ToolProvider);

      this.logger.log(`[${jobEntity.id}] Executing tool...`);
      const rawOutput = await tool.execute(jobEntity);
      this.logger.debug(
        `[${jobEntity.id}] Raw output from Perplexity: ${rawOutput}`,
      );
      await this.jobsService.logOutput(jobEntity.id, rawOutput);
      this.logger.log(
        `[${jobEntity.id}] Tool execution complete. Raw output logged.`,
      );

      this.logger.log(`[${jobEntity.id}] Structuring output with OpenAI...`);
      const structuredOutput = await this._structureOutput(rawOutput);
      this.logger.debug(
        `[${jobEntity.id}] Structured output from OpenAI: ${JSON.stringify(structuredOutput, null, 2)}`,
      );
      await this.jobsService.logOutput(
        jobEntity.id,
        rawOutput,
        structuredOutput,
      );
      this.logger.log(`[${jobEntity.id}] Output structured successfully.`);

      this.logger.log(`[${jobEntity.id}] Persisting new events...`);
      const newEvents = await this._persistEvents(
        structuredOutput.events,
        jobEntity,
      );
      this.logger.log(
        `[${jobEntity.id}] Persistence complete. Found and saved ${newEvents.length} new events.`,
      );

      await this.jobsService.updateStatus(jobEntity.id, JobStatus.COMPLETED);
      this.logger.log(`[${jobEntity.id}] Job marked as COMPLETED.`);
      return { status: 'COMPLETED', newEventsFound: newEvents.length };
    } catch (error) {
      this.logger.error(`[${jobEntity.id}] Job failed`, error.stack);
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
    const allCities = await this.cityRepository.find();
    const inputCities =
      ((sourceJob.inputParameters as any)?.cities as string[]) || [];

    for (const eventData of events) {
      const existingByUrl = await this.eventRepository.findOneBy({
        website_url: eventData.url,
      });
      const existingByNameDate = await this.eventRepository
        .createQueryBuilder('event')
        .where('LOWER(event.name) = LOWER(:name)', { name: eventData.name })
        .andWhere('event.start_dt = :date', { date: eventData.startDate })
        .getOne();

      if (!existingByUrl && !existingByNameDate) {
        const newEvent = this.eventRepository.create({
          name: eventData.name,
          website_url: eventData.url,
          start_dt: new Date(eventData.startDate),
          end_dt: eventData.endDate
            ? new Date(eventData.endDate)
            : new Date(eventData.startDate),
          created_from_job: sourceJob,
        });

        // Robust City Mapping
        let matchedCity = allCities.find((c) =>
          eventData.venue.toLowerCase().includes(c.name.toLowerCase()),
        );

        if (!matchedCity) {
          // Fallback: Check against the job's input cities
          const inputCityNames = inputCities.map((c) => c.toLowerCase());
          matchedCity = allCities.find((c) =>
            inputCityNames.includes(c.name.toLowerCase()),
          );
        }

        if (matchedCity) {
          (newEvent as any).city = matchedCity;
        }

        const savedEvent = await this.eventRepository.save(newEvent);
        newEvents.push(savedEvent);
      }
    }
    return newEvents;
  }
}
