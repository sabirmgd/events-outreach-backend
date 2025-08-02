import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { PERSONA_QUEUE } from '../queue/constants';
import { CreatePersonDto } from './dto/create-person.dto';
import { FindAllPersonasDto } from './dto/find-all-personas.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CompanyPersonRole } from './entities/company-person-role.entity';
import { ContactChannel } from './entities/contact-channel.entity';
import { Person } from './entities/person.entity';

@Injectable()
export class PersonaService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(ContactChannel)
    private readonly contactChannelRepository: Repository<ContactChannel>,
    @InjectRepository(CompanyPersonRole)
    private readonly companyPersonRoleRepository: Repository<CompanyPersonRole>,
    private readonly companyService: CompanyService,
    @InjectQueue(PERSONA_QUEUE) private readonly personaQueue: Queue,
  ) {}

  async discoverPersonas(companyId: number) {
    const company = await this.companyService.findOne(companyId);
    const job = await this.personaQueue.add('discover-personas', {
      companyId: company.id,
    });
    return { jobId: job.id };
  }

  create(
    createPersonDto: CreatePersonDto,
    organizationId: string,
  ): Promise<Person> {
    const person = this.personRepository.create({
      ...createPersonDto,
      organization: { id: organizationId },
    });
    return this.personRepository.save(person);
  }

  async findAll(
    findAllPersonasDto: FindAllPersonasDto,
    organizationId: string,
  ): Promise<{ data: Person[]; total: number }> {
    const { page = 1, limit = 20, sort, search } = findAllPersonasDto;

    const queryBuilder = this.personRepository.createQueryBuilder('person');

    queryBuilder
      .leftJoinAndSelect('person.organization', 'organization')
      .leftJoinAndSelect('person.companyRoles', 'companyRoles')
      .leftJoinAndSelect('companyRoles.company', 'company')
      .leftJoinAndSelect('company.eventSponsors', 'eventSponsors')
      .leftJoinAndSelect('eventSponsors.event', 'sponsorEvent')
      .leftJoinAndSelect('sponsorEvent.signal', 'eventSignal')
      .leftJoinAndSelect('person.conversations', 'conversation')
      .leftJoinAndSelect('conversation.sequence', 'sequence')
      .leftJoinAndSelect('sequence.signal', 'signal')
      .leftJoinAndSelect('conversation.current_step', 'current_step')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('organization.id = :organizationId', { organizationId });

    if (search) {
      queryBuilder.andWhere(
        '(person.full_name ILIKE :search OR company.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (sort) {
      const [sortField, sortOrder] = sort.split(':');
      const order = sortOrder.toUpperCase() as 'ASC' | 'DESC';

      // Map frontend sort fields to database fields
      switch (sortField) {
        case 'lastContact':
          // Sort by the person's last_updated_at (approximation of last contact)
          queryBuilder.orderBy('person.last_updated_at', order);
          break;
        case 'name':
          queryBuilder.orderBy('person.full_name', order);
          break;
        case 'created_at':
        case 'updated_at':
        case 'full_name':
        case 'first_name':
        case 'last_name':
          queryBuilder.orderBy(`person.${sortField}`, order);
          break;
        default:
          // Default to created_at if unknown field
          queryBuilder.orderBy('person.created_at', order);
      }
    } else {
      queryBuilder.orderBy('person.created_at', 'DESC');
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number, relations: string[] = []): Promise<Person> {
    const person = await this.personRepository.findOne({
      where: { id },
      relations,
    });
    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }
    return person;
  }

  async update(id: number, updatePersonDto: UpdatePersonDto): Promise<Person> {
    const person = await this.findOne(id);
    const updated = this.personRepository.merge(person, updatePersonDto);
    return this.personRepository.save(updated);
  }

  async remove(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.personRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }
    return { deleted: true, id };
  }

  // --- CompanyPersonRole Methods ---
  async addRole(
    personId: number,
    companyId: number,
    role_title: string,
  ): Promise<CompanyPersonRole> {
    const person = await this.findOne(personId);
    const company = await this.companyService.findOne(companyId);

    const role = this.companyPersonRoleRepository.create({
      person,
      company,
      role_title,
    });
    return this.companyPersonRoleRepository.save(role);
  }

  async classifyRole(roleId: number) {
    const role = await this.companyPersonRoleRepository.findOne({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException(
        `CompanyPersonRole with ID ${roleId} not found`,
      );
    }

    // TODO: Implement LLM-based classification logic here.
    // For now, we'll use a simple heuristic.
    const title = role.role_title.toLowerCase();
    if (
      title.includes('manager') ||
      title.includes('director') ||
      title.includes('vp')
    ) {
      role.is_decision_maker = true;
    }
    if (title.includes('marketing')) {
      role.role_category = 'marketing';
    } else if (title.includes('sales')) {
      role.role_category = 'sales';
    } else {
      role.role_category = 'other';
    }

    return this.companyPersonRoleRepository.save(role);
  }

  async findByLinkedIn(linkedinUrl: string): Promise<Person | null> {
    if (!linkedinUrl) return null;
    return await this.personRepository.findOne({
      where: { linkedin_url: linkedinUrl },
    });
  }

  async findByEmail(email: string): Promise<Person | null> {
    if (!email) return null;
    // Assuming email is stored in contact_channels table
    const channel = await this.contactChannelRepository.findOne({
      where: {
        type: 'email',
        value: email,
      },
      relations: ['person'],
    });
    return channel?.person || null;
  }
}
