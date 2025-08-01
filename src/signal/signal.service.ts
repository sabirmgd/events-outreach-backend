import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal, SignalStatus } from './entities/signal.entity';
import { CreateSignalDto } from './dto/create-signal.dto';
import { UpdateSignalDto } from './dto/update-signal.dto';
import { FindSignalsDto } from './dto/find-signals.dto';

@Injectable()
export class SignalService {
  constructor(
    @InjectRepository(Signal)
    private signalRepository: Repository<Signal>,
  ) {}

  async create(createSignalDto: CreateSignalDto, userId: string): Promise<Signal> {
    const signal = this.signalRepository.create({
      ...createSignalDto,
      createdById: userId,
      stats: {
        totalExecutions: 0,
        totalEventsFound: 0,
        totalCompaniesIdentified: 0,
        totalContactsDiscovered: 0,
        totalMessagesSent: 0,
        totalResponses: 0,
        totalMeetingsBooked: 0,
      },
    });

    return await this.signalRepository.save(signal);
  }

  async findAll(query: FindSignalsDto): Promise<{ data: Signal[]; total: number }> {
    const queryBuilder = this.signalRepository.createQueryBuilder('signal');

    if (query.status) {
      queryBuilder.andWhere('signal.status = :status', { status: query.status });
    }

    if (query.type) {
      queryBuilder.andWhere('signal.type = :type', { type: query.type });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(signal.name ILIKE :search OR signal.description ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    // Apply sorting
    const sortField = query.sort?.startsWith('-') ? query.sort.substring(1) : query.sort || 'createdAt';
    const sortOrder = query.sort?.startsWith('-') ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`signal.${sortField}`, sortOrder);

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Signal> {
    const signal = await this.signalRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!signal) {
      throw new NotFoundException(`Signal with ID ${id} not found`);
    }

    return signal;
  }

  async update(id: string, updateSignalDto: UpdateSignalDto): Promise<Signal> {
    const signal = await this.findOne(id);
    
    Object.assign(signal, updateSignalDto);
    
    return await this.signalRepository.save(signal);
  }

  async remove(id: string): Promise<void> {
    const signal = await this.findOne(id);
    await this.signalRepository.remove(signal);
  }

  async activate(id: string): Promise<Signal> {
    const signal = await this.findOne(id);
    
    if (signal.status === SignalStatus.ARCHIVED) {
      throw new BadRequestException('Cannot activate an archived signal');
    }
    
    signal.status = SignalStatus.ACTIVE;
    return await this.signalRepository.save(signal);
  }

  async pause(id: string): Promise<Signal> {
    const signal = await this.findOne(id);
    
    if (signal.status === SignalStatus.ARCHIVED) {
      throw new BadRequestException('Cannot pause an archived signal');
    }
    
    signal.status = SignalStatus.PAUSED;
    return await this.signalRepository.save(signal);
  }

  async updateStats(id: string, executionResults: any): Promise<void> {
    const signal = await this.findOne(id);
    
    signal.stats = {
      ...signal.stats,
      totalExecutions: signal.stats.totalExecutions + 1,
      totalEventsFound: signal.stats.totalEventsFound + (executionResults.eventsDiscovered || 0),
      totalCompaniesIdentified: signal.stats.totalCompaniesIdentified + (executionResults.companiesFound || 0),
      totalContactsDiscovered: signal.stats.totalContactsDiscovered + (executionResults.contactsDiscovered || 0),
      totalMessagesSent: signal.stats.totalMessagesSent + (executionResults.messagesSent || 0),
      lastExecuted: new Date(),
    };
    
    await this.signalRepository.save(signal);
  }

  async getExecutionData(id: string): Promise<any> {
    // Get all events, companies, and contacts created by this signal
    const signal = await this.findOne(id);
    
    // For now, return the aggregated stats
    // In a real implementation, this would query the actual event, company, and contact tables
    return {
      events: [],
      companies: [],
      contacts: [],
      stats: signal.stats,
    };
  }
}