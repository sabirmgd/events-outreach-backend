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

  create(createPersonDto: CreatePersonDto): Promise<Person> {
    const person = this.personRepository.create(createPersonDto);
    return this.personRepository.save(person);
  }

  findAll(findAllPersonasDto: FindAllPersonasDto): Promise<Person[]> {
    return this.personRepository.find({
      relations: findAllPersonasDto.relations || [],
    });
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
