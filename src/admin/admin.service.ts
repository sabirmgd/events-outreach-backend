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

    const invitationToken = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 1); // Token is valid for 1 day

    const adminUser = this.userRepository.create({
      name: dto.adminName,
      email: dto.adminEmail,
      is_active: false, // User is inactive until invitation is accepted
      invitationToken: invitationToken,
      invitationExpiresAt: expires,
      organization: newOrganization,
      team: newTeam,
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

    return {
      organization: newOrganization,
      invitationToken: invitationToken,
    };
  }

  async findAllOrganizationsWithAdmins() {
    const organizations = await this.organizationRepository.find({
      relations: ['users', 'users.roles'],
    });

    return organizations.map((org) => {
      const admin = org.users.find((user) =>
        user.roles?.some(
          (role: Role) => role.name === 'ADMIN' || role.name === 'SUPER_ADMIN',
        ),
      );

      return {
        id: org.id,
        name: org.name,
        createdAt: org.created_at,
        admin: admin
          ? {
              id: admin.id,
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
      relations: ['users', 'users.roles'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (dto.organizationName) {
      organization.name = dto.organizationName;
    }

    if (dto.adminName) {
      const admin = organization.users.find((user) =>
        user.roles?.some(
          (role: Role) => role.name === 'ADMIN' || role.name === 'SUPER_ADMIN',
        ),
      );

      if (admin) {
        admin.name = dto.adminName;
        await this.userRepository.save(admin);
      }
    }

    await this.organizationRepository.save(organization);

    // Refetch to return the updated admin info
    const updatedOrg = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users', 'users.roles'],
    });

    if (!updatedOrg) {
      throw new NotFoundException(
        `Organization with ID ${id} could not be refetched after update.`,
      );
    }

    const updatedAdmin = updatedOrg.users.find((user) =>
      user.roles?.some((role) => role.name === 'ADMIN'),
    );

    return {
      id: updatedOrg.id,
      name: updatedOrg.name,
      createdAt: updatedOrg.created_at,
      admin: updatedAdmin
        ? {
            id: updatedAdmin.id,
            name: updatedAdmin.name,
            email: updatedAdmin.email,
          }
        : null,
    };
  }

  async deleteOrganization(id: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    await this.organizationRepository.remove(organization);
    return { success: true, message: 'Organization deleted successfully' };
  }
}
