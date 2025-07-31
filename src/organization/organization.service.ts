import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Team } from './entities/team.entity';
import { UserService } from '../user/user.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
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

  // TODO: Add other methods like findOne, addUserToTeam, etc.
}
