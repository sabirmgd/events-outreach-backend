import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { Signal, SignalStatus } from './entities/signal.entity';
import { CreateSignalDto } from './dto/create-signal.dto';
import { UpdateSignalDto } from './dto/update-signal.dto';
import { FindSignalsDto } from './dto/find-signals.dto';
import { OutreachSequence } from '../outreach/entities/outreach-sequence.entity';
import { OutreachStepTemplate } from '../outreach/entities/outreach-step-template.entity';

interface ExecutionResults {
  eventsDiscovered?: number;
  companiesFound?: number;
  contactsDiscovered?: number;
  messagesSent?: number;
}

@Injectable()
export class SignalService {
  constructor(
    @InjectRepository(Signal)
    private signalRepository: Repository<Signal>,
    private connection: Connection,
  ) {}

  async createWithSequence(
    createSignalDto: CreateSignalDto,
    userId: string,
    organizationId: string,
  ): Promise<Signal> {
    const { outreachSequence, ...signalData } = createSignalDto;

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const signalEntity = this.signalRepository.create({
        ...signalData,
        createdById: userId,
        organization: { id: organizationId },
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
      const savedSignal = await queryRunner.manager.save(signalEntity);

      if (outreachSequence) {
        const sequenceEntity = queryRunner.manager.create(OutreachSequence, {
          ...outreachSequence,
          signal: savedSignal,
        });
        const savedSequence = await queryRunner.manager.save(sequenceEntity);

        if (outreachSequence.steps && outreachSequence.steps.length > 0) {
          const stepEntities = outreachSequence.steps.map((stepDto) =>
            queryRunner.manager.create(OutreachStepTemplate, {
              ...stepDto,
              sequence: savedSequence,
            }),
          );
          await queryRunner.manager.save(stepEntities);
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(savedSignal.id); // Re-fetch to get all relations
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    query: FindSignalsDto,
    organizationId: string,
  ): Promise<{ data: Signal[]; total: number }> {
    const queryBuilder = this.signalRepository.createQueryBuilder('signal');

    queryBuilder.where('signal.organization_id = :organizationId', {
      organizationId,
    });

    if (query.status) {
      queryBuilder.andWhere('signal.status = :status', {
        status: query.status,
      });
    }

    if (query.type) {
      queryBuilder.andWhere('signal.type = :type', { type: query.type });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(signal.name ILIKE :search OR signal.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const sortField = query.sort?.startsWith('-')
      ? query.sort.substring(1)
      : query.sort || 'createdAt';
    const sortOrder = query.sort?.startsWith('-') ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`signal.${sortField}`, sortOrder);

    const page = query.page || 1;
    const limit = query.limit || 20;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Signal> {
    const signal = await this.signalRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'organization',
        'outreachSequences',
        'outreachSequences.steps',
      ],
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

  async updateStats(
    id: string,
    executionResults: ExecutionResults,
  ): Promise<void> {
    const signal = await this.findOne(id);

    signal.stats = {
      ...signal.stats,
      totalExecutions: signal.stats.totalExecutions + 1,
      totalEventsFound:
        signal.stats.totalEventsFound +
        (executionResults.eventsDiscovered || 0),
      totalCompaniesIdentified:
        signal.stats.totalCompaniesIdentified +
        (executionResults.companiesFound || 0),
      totalContactsDiscovered:
        signal.stats.totalContactsDiscovered +
        (executionResults.contactsDiscovered || 0),
      totalMessagesSent:
        signal.stats.totalMessagesSent + (executionResults.messagesSent || 0),
      lastExecuted: new Date(),
    };

    await this.signalRepository.save(signal);
  }

  async getExecutionData(id: string): Promise<any> {
    const signal = await this.findOne(id);
    return {
      events: [],
      companies: [],
      contacts: [],
      stats: signal.stats,
    };
  }
}
