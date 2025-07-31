import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organization/entities/organization.entity';
import { CreateOrganizationWithAdminDto } from './dto/create-organization-with-admin.dto';
import { Role } from '../auth/entities/role.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { User } from '../user/entities/user.entity';
import { Team } from '../organization/entities/team.entity';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async createOrganizationWithAdmin(dto: CreateOrganizationWithAdminDto) {
    const newOrganization = this.organizationRepository.create({
      name: dto.organizationName,
    });
    await this.organizationRepository.save(newOrganization);

    const newTeam = this.teamRepository.create({
      name: 'General',
      organization: newOrganization,
    });
    await this.teamRepository.save(newTeam);

    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 1); // Token is valid for 1 day

    const adminUser = this.userRepository.create({
      name: dto.adminName,
      email: dto.adminEmail,
      is_active: false,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), // Temporary password
    });

    let adminRole = await this.roleRepository.findOne({
      where: { name: 'ADMIN' },
    });
    if (!adminRole) {
      adminRole = this.roleRepository.create({ name: 'ADMIN' });
      await this.roleRepository.save(adminRole);
    }
    adminUser.roles = [adminRole];

    await this.userRepository.save(adminUser);

    // Ensure two-way relation is persisted
    newTeam.members = [adminUser];
    await this.teamRepository.save(newTeam);

    return {
      organization: newOrganization,
      invitationToken: token, // Store token separately if needed
    };
  }

  async findAllOrganizationsWithAdmins() {
    const organizations = await this.organizationRepository.find({
      relations: ['teams', 'teams.members', 'teams.members.roles'],
    });

    return organizations.map((org) => {
      const admin = org.teams
        .flatMap((team) => team.members)
        .find((user) =>
          user.roles?.some((role: Role) => role.name === 'ADMIN'),
        );

      return {
        id: org.id,
        name: org.name,
        createdAt: org.created_at,
        admin: admin
          ? {
              name: admin.name,
              email: admin.email,
            }
          : null,
      };
    });
  }

  async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['teams', 'teams.members', 'teams.members.roles'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (dto.organizationName) {
      organization.name = dto.organizationName;
    }

    if (dto.adminName) {
      const admin = organization.teams
        .flatMap((team) => team.members)
        .find((user) =>
          user.roles?.some((role: Role) => role.name === 'ADMIN'),
        );

      if (admin) {
        admin.name = dto.adminName;
        await this.userRepository.save(admin);
      }
    }

    return this.organizationRepository.save(organization);
  }

  async deleteOrganization(id: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    await this.organizationRepository.remove(organization);
    return { message: 'Organization deleted successfully' };
  }
}
