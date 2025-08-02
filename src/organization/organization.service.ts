import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Team } from './entities/team.entity';
import { UserService } from '../user/user.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { User } from '../user/entities/user.entity';
import { EmailSender } from './entities/email-sender.entity';
import { CreateEmailSenderDto } from './dto/create-email-sender.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(EmailSender)
    private readonly emailSenderRepository: Repository<EmailSender>,
    private readonly userService: UserService,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
    adminUser: User,
  ): Promise<Organization> {
    // Create the organization
    const organization = this.organizationRepository.create({
      name: createOrganizationDto.name,
    });
    await this.organizationRepository.save(organization);

    // Create the default team
    const defaultTeam = this.teamRepository.create({
      name: 'General',
      organization,
    });
    await this.teamRepository.save(defaultTeam);

    // Assign the admin user to the new org and team
    adminUser.organization = organization;
    adminUser.team = defaultTeam;
    await this.userService.save(adminUser);

    return organization;
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['teams', 'emailSenders'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async createEmailSender(
    organizationId: string,
    createEmailSenderDto: CreateEmailSenderDto,
  ): Promise<EmailSender> {
    const organization = await this.findOne(organizationId);

    const emailSender = this.emailSenderRepository.create({
      ...createEmailSenderDto,
      organization,
      daily_limit: createEmailSenderDto.daily_limit || 400,
    });

    return this.emailSenderRepository.save(emailSender);
  }

  async getEmailSenders(organizationId: string): Promise<EmailSender[]> {
    return this.emailSenderRepository.find({
      where: { organization: { id: organizationId } },
    });
  }
}
