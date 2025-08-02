import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, MoreThan, Repository } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { GeographyService } from '../geography/geography.service';
import { DISCOVERY_QUEUE, SCRAPE_QUEUE } from '../queue/constants';
import { CreateEventDto } from './dto/create-event.dto';
import { DiscoverEventsDto } from './dto/discover-events.dto';
import { FindAllEventsDto } from './dto/find-all-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventCandidate } from './entities/event-candidate.entity';
import { EventSponsor } from './entities/event-sponsor.entity';
import { JobsService } from '@jobs/jobs.service';
import { JobType } from '@jobs/enums/job-type.enum';
import { Signal } from '../signal/entities/signal.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventCandidate)
    private readonly eventCandidateRepository: Repository<EventCandidate>,
    @InjectRepository(EventSponsor)
    private readonly eventSponsorRepository: Repository<EventSponsor>,
    private readonly geographyService: GeographyService,
    private readonly companyService: CompanyService,
    private readonly jobsService: JobsService,
    @InjectQueue(DISCOVERY_QUEUE) private readonly discoveryQueue: Queue,
    @InjectQueue(SCRAPE_QUEUE) private readonly scrapeQueue: Queue,
  ) {}

  async discoverEvents(discoverEventsDto: DiscoverEventsDto) {
    const { cities, topic, dateRange } = discoverEventsDto;

    // 1. Fetch existing events to avoid duplicates
    const existingEvents = await this.eventRepository.find({
      where: {
        city: { name: In(cities) },
        start_dt: MoreThan(new Date()),
        // A more complex query would be needed for topics/tags
      },
    });

    const cappedExisting = existingEvents.slice(0, 50);
    const existingEventNames = cappedExisting.map((e) => `- ${e.name}`);

    const exampleJson = `{
  "events": [
    {
      "name": "TechCrunch Disrupt",
      "url": "https://disrupt.tech",
      "startDate": "2025-09-12",
      "endDate": "2025-09-14",
      "venue": "Moscone Center"
    }
  ]
}`;

    const prompt = [
      'SYSTEM: You are EventScout-GPT. Return strictly valid JSON that matches the schema.',
      `Task: Find all upcoming ${topic} events in ${cities.join(
        ', ',
      )} within ${dateRange}. Today's date is ${new Date().toDateString()}.`,
      'Exclude already-known events listed below.',
      existingEventNames.join('\n') || 'None',
      'Return JSON exactly like this example, including the endDate if available (it can be null):',
      exampleJson,
    ].join('\n\n');

    // 3. Create the job entity
    const job = await this.jobsService.create(
      {
        type: JobType.EVENT_DISCOVERY,
        inputParameters: { cities, topic, dateRange },
      },
      prompt,
    );

    await this.discoveryQueue.add('discover', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return { jobId: job.id };
  }

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const { venue_id, city_id, created_from_candidate_id, signalId, ...rest } =
      createEventDto;

    const eventData: Partial<Event> = {
      ...rest,
      start_dt: new Date(rest.start_dt),
      end_dt: rest.end_dt ? new Date(rest.end_dt) : undefined,
    };

    if (venue_id) {
      eventData.venue = await this.geographyService.findOneVenue(venue_id);
    }
    eventData.city = await this.geographyService.findOneCity(city_id);
    if (created_from_candidate_id) {
      eventData.created_from_candidate = await this.findOneCandidate(
        created_from_candidate_id,
      );
    }
    if (signalId) {
      eventData.signal = { id: signalId } as Signal;
    }

    const event = this.eventRepository.create(eventData);
    return this.eventRepository.save(event);
  }

  findAll(findAllEventsDto: FindAllEventsDto): Promise<Event[]> {
    return this.eventRepository.find({
      relations: findAllEventsDto.relations || [
        'venue',
        'city',
        'created_from_candidate',
        'signal',
      ],
    });
  }

  async findOne(id: number, relations: string[] = []): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: relations.length
        ? relations
        : ['venue', 'city', 'created_from_candidate', 'signal'],
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    const { venue_id, city_id, created_from_candidate_id, signalId, ...rest } =
      updateEventDto;
    const event = await this.findOne(id);

    const updatedEventData: Partial<Event> = {
      ...rest,
      start_dt: rest.start_dt ? new Date(rest.start_dt) : undefined,
      end_dt: rest.end_dt ? new Date(rest.end_dt) : undefined,
    };

    if (venue_id) {
      updatedEventData.venue =
        await this.geographyService.findOneVenue(venue_id);
    }
    if (city_id) {
      updatedEventData.city = await this.geographyService.findOneCity(city_id);
    }
    if (created_from_candidate_id) {
      updatedEventData.created_from_candidate = await this.findOneCandidate(
        created_from_candidate_id,
      );
    }
    if (signalId) {
      updatedEventData.signal = { id: signalId } as Signal;
    }

    Object.assign(event, updatedEventData);

    return this.eventRepository.save(event);
  }

  async remove(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.eventRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return { deleted: true, id };
  }

  // --- Candidate Methods ---
  async findOneCandidate(id: number): Promise<EventCandidate> {
    const candidate = await this.eventCandidateRepository.findOne({
      where: { id },
    });
    if (!candidate) {
      throw new NotFoundException(`EventCandidate with ID ${id} not found`);
    }
    return candidate;
  }

  async promoteCandidate(id: number): Promise<Event> {
    const candidate = await this.findOneCandidate(id);
    // This is a simplified promotion. In a real-world scenario, you would
    // likely have a more sophisticated mapping and validation process.
    const city = await this.geographyService.findOneCity(1); // HACK: Hardcoded city
    const event = await this.create({
      name: candidate.raw_title,
      start_dt: candidate.raw_start_dt,
      end_dt: candidate.raw_end_dt,
      website_url: candidate.url,
      created_from_candidate_id: candidate.id,
      city_id: city.id,
    });
    candidate.status = 'promoted';
    await this.eventCandidateRepository.save(candidate);
    return event;
  }

  async rejectCandidate(id: number): Promise<EventCandidate> {
    const candidate = await this.findOneCandidate(id);
    candidate.status = 'rejected';
    return this.eventCandidateRepository.save(candidate);
  }

  // --- Sponsor Methods ---
  async rescanSponsors(eventId: number) {
    const event = await this.findOne(eventId);
    const job = await this.scrapeQueue.add('sponsor-page', {
      eventId: event.id,
      url: event.website_url, // Or a more specific sponsor page URL
    });
    return { jobId: job.id };
  }
}
