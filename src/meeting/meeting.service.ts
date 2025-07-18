import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { EventService } from '../event/event.service';
import { CalComWebhookDto } from './dto/cal-com-webhook.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { Meeting } from './entities/meeting.entity';
import { MeetingSource } from './entities/meeting-source.entity';

@Injectable()
export class MeetingService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingSource)
    private readonly meetingSourceRepository: Repository<MeetingSource>,
    private readonly eventService: EventService,
    private readonly companyService: CompanyService,
  ) {}

  async createFromWebhook(payload: CalComWebhookDto): Promise<Meeting> {
    // This is a simplified implementation. In a real-world scenario, you would
    // have more sophisticated logic to parse the payload, find the corresponding
    // event, company, and person, and create the meeting and attendees.
    const meeting = await this.create({
      scheduled_start_dt: payload.startTime,
      scheduled_end_dt: payload.endTime,
      meeting_url: payload.videoCallUrl,
      booking_source: 'cal.com', // Assuming the webhook is from Cal.com
    });
    const source = this.meetingSourceRepository.create({
      meeting,
      source_payload_json: payload,
    });
    await this.meetingSourceRepository.save(source);
    return meeting;
  }

  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    const { event_id, company_id, ...rest } = createMeetingDto;
    let event;
    if (event_id) {
      event = await this.eventService.findOne(event_id);
    }
    let company;
    if (company_id) {
      company = await this.companyService.findOne(company_id);
    }

    const meeting = this.meetingRepository.create({ ...rest, event, company });
    return this.meetingRepository.save(meeting);
  }

  findAll(): Promise<Meeting[]> {
    return this.meetingRepository.find({ relations: ['event', 'company'] });
  }

  async findOne(id: number): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: ['event', 'company'],
    });
    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }
    return meeting;
  }

  async update(
    id: number,
    updateMeetingDto: UpdateMeetingDto,
  ): Promise<Meeting> {
    const { event_id, company_id, ...rest } = updateMeetingDto;
    const meeting = await this.findOne(id);

    let event;
    if (event_id) {
      event = await this.eventService.findOne(event_id);
    }
    let company;
    if (company_id) {
      company = await this.companyService.findOne(company_id);
    }

    const updated = this.meetingRepository.merge(meeting, {
      ...rest,
      event,
      company,
    });
    return this.meetingRepository.save(updated);
  }

  async remove(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.meetingRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }
    return { deleted: true, id };
  }
}
