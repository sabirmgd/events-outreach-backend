import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { Organization } from '../organization/entities/organization.entity';
import { Team } from '../organization/entities/team.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Event } from '../event/entities/event.entity';
import { City } from '../geography/entities/city.entity';
import { Company } from '../company/entities/company.entity';
import { EventSponsor } from '../event/entities/event-sponsor.entity';
import { Person } from '../persona/entities/person.entity';
import { CompanyPersonRole } from '../persona/entities/company-person-role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { Action } from '../auth/enums/action.enum';
import { Subject } from '../auth/enums/subject.enum';
import { ConfigService } from '@nestjs/config';
import { ContactChannel } from '../persona/entities/contact-channel.entity';

interface SeedContact {
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  linkedin_url: string;
  seniority: string;
  location_text: string;
  source_confidence: number;
}

interface SeedSponsor {
  name: string;
  website: string;
  contacts: SeedContact[];
}

interface SeedEvent {
  name: string;
  start_dt: string;
  end_dt: string;
  website_url: string;
  city: {
    name: string;
    country_code: string;
  };
  sponsors: SeedSponsor[];
}

interface SeedOrganization {
  name: string;
  admin: {
    name: string;
    email: string;
    password: string;
  };
  events: SeedEvent[];
}

interface SeedData {
  organizations: SeedOrganization[];
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(EventSponsor)
    private readonly eventSponsorRepository: Repository<EventSponsor>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(CompanyPersonRole)
    private readonly companyPersonRoleRepository: Repository<CompanyPersonRole>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting database seeding process...');
    await this.seedPermissions();
    await this.seedSuperAdmin();
    await this.seedFromDataFile();
    this.logger.log('Database seeding completed successfully.');
  }

  private async seedFromDataFile() {
    const filePath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Seed data file not found at ${filePath}. Skipping.`);
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const seedData = JSON.parse(fileContent) as SeedData;

    const adminRole = await this.findOrCreateRole('ORGANIZATION_ADMIN');

    for (const orgData of seedData.organizations) {
      const organization = await this.findOrCreateOrganization(orgData.name);
      const team = await this.findOrCreateTeam('General', organization);
      await this.findOrCreateAdminUser(
        orgData.admin,
        organization,
        team,
        adminRole,
      );

      for (const eventData of orgData.events) {
        const city = await this.findOrCreateCity(
          eventData.city.name,
          eventData.city.country_code,
        );
        const event = await this.findOrCreateEvent(
          eventData,
          organization,
          city,
        );

        for (const sponsorData of eventData.sponsors) {
          const company = await this.findOrCreateCompany(
            sponsorData.name,
            sponsorData.website,
          );
          await this.findOrCreateEventSponsor(event, company);

          for (const contactData of sponsorData.contacts) {
            const person = await this.findOrCreatePerson(contactData);
            await this.findOrCreateContactChannel(
              person,
              'email',
              contactData.email,
            );
            await this.findOrCreateCompanyPersonRole(
              person,
              company,
              contactData.title,
            );
          }
        }
      }
    }
  }

  private async findOrCreateOrganization(name: string): Promise<Organization> {
    let organization = await this.organizationRepository.findOne({
      where: { name },
    });
    if (!organization) {
      this.logger.log(`Creating organization: ${name}`);
      organization = this.organizationRepository.create({ name });
      await this.organizationRepository.save(organization);
    }
    return organization;
  }

  private async findOrCreateTeam(
    name: string,
    organization: Organization,
  ): Promise<Team> {
    let team = await this.teamRepository.findOne({
      where: { name, organization: { id: organization.id } },
    });
    if (!team) {
      this.logger.log(
        `Creating team: ${name} for organization ${organization.name}`,
      );
      team = this.teamRepository.create({ name, organization });
      await this.teamRepository.save(team);
    }
    return team;
  }

  private async findOrCreateRole(name: string): Promise<Role> {
    let role = await this.roleRepository.findOne({ where: { name } });
    if (!role) {
      this.logger.log(`Creating role: ${name}`);
      // In a real app, you'd assign specific permissions here
      role = this.roleRepository.create({ name, permissions: [] });
      await this.roleRepository.save(role);
    }
    return role;
  }

  private async findOrCreateAdminUser(
    adminData: SeedOrganization['admin'],
    organization: Organization,
    team: Team,
    role: Role,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { email: adminData.email },
    });
    if (!user) {
      this.logger.log(
        `Creating admin user: ${adminData.email} for organization ${organization.name}`,
      );
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      user = this.userRepository.create({
        name: adminData.name,
        email: adminData.email,
        password_hash: hashedPassword,
        organization,
        team,
        roles: [role],
        is_active: true,
      });
      await this.userRepository.save(user);
    }
    return user;
  }

  private async findOrCreateCity(
    name: string,
    country_code: string,
  ): Promise<City> {
    let city = await this.cityRepository.findOne({
      where: { name, country_code },
    });
    if (!city) {
      this.logger.log(`Creating city: ${name}, ${country_code}`);
      city = this.cityRepository.create({ name, country_code });
      await this.cityRepository.save(city);
    }
    return city;
  }

  private async findOrCreateEvent(
    eventData: SeedEvent,
    organization: Organization,
    city: City,
  ): Promise<Event> {
    let event = await this.eventRepository.findOne({
      where: { name: eventData.name, organization: { id: organization.id } },
    });
    if (!event) {
      this.logger.log(`Creating event: ${eventData.name}`);
      event = this.eventRepository.create({
        name: eventData.name,
        start_dt: new Date(eventData.start_dt),
        end_dt: new Date(eventData.end_dt),
        website_url: eventData.website_url,
        organization,
        city,
      });
      await this.eventRepository.save(event);
    }
    return event;
  }

  private async findOrCreateCompany(
    name: string,
    website: string,
  ): Promise<Company> {
    let company = await this.companyRepository.findOne({ where: { name } });
    if (!company) {
      this.logger.log(`Creating company: ${name}`);
      company = this.companyRepository.create({ name, website: website });
      await this.companyRepository.save(company);
    }
    return company;
  }

  private async findOrCreateEventSponsor(
    event: Event,
    company: Company,
  ): Promise<EventSponsor> {
    let sponsorLink = await this.eventSponsorRepository.findOne({
      where: { event: { id: event.id }, company: { id: company.id } },
    });
    if (!sponsorLink) {
      this.logger.log(
        `Linking company ${company.name} as a sponsor to event ${event.name}`,
      );
      sponsorLink = this.eventSponsorRepository.create({ event, company });
      await this.eventSponsorRepository.save(sponsorLink);
    }
    return sponsorLink;
  }

  private async findOrCreatePerson(contactData: SeedContact): Promise<Person> {
    let person = await this.personRepository.findOne({
      where: { linkedin_url: contactData.linkedin_url },
    });
    if (!person) {
      this.logger.log(`Creating person: ${contactData.name}`);
      person = this.personRepository.create({
        full_name: contactData.name,
        first_name: contactData.first_name,
        last_name: contactData.last_name,
        linkedin_url: contactData.linkedin_url,
        seniority: contactData.seniority,
        current_title: contactData.title,
        location_text: contactData.location_text,
        source_confidence: contactData.source_confidence,
      });
      await this.personRepository.save(person);
    }
    return person;
  }

  private async findOrCreateContactChannel(
    person: Person,
    type: string,
    value: string,
  ): Promise<ContactChannel> {
    let channel = await this.personRepository.manager
      .getRepository(ContactChannel)
      .findOne({ where: { person: { id: person.id }, type, value } });
    if (!channel) {
      this.logger.log(`Creating ${type} channel for person ${person.id}`);
      channel = this.personRepository.manager
        .getRepository(ContactChannel)
        .create({ person, type, value });
      await this.personRepository.manager
        .getRepository(ContactChannel)
        .save(channel);
    }
    return channel;
  }

  private async findOrCreateCompanyPersonRole(
    person: Person,
    company: Company,
    title: string,
  ): Promise<CompanyPersonRole> {
    let roleLink = await this.companyPersonRoleRepository.findOne({
      where: { person: { id: person.id }, company: { id: company.id } },
    });
    if (!roleLink) {
      this.logger.log(
        `Linking person ${person.full_name} to company ${company.name} as ${title}`,
      );
      roleLink = this.companyPersonRoleRepository.create({
        person,
        company,
        role_title: title,
      });
      await this.companyPersonRoleRepository.save(roleLink);
    }
    return roleLink;
  }

  private async seedPermissions() {
    const permissions = [
      { action: Action.Create, subject: Subject.Organization },
      { action: Action.Read, subject: Subject.Organization },
      { action: Action.Update, subject: Subject.Organization },
      { action: Action.Delete, subject: Subject.Organization },
      { action: Action.Create, subject: Subject.User },
      { action: Action.Read, subject: Subject.User },
      { action: Action.Update, subject: Subject.User },
      { action: Action.Delete, subject: Subject.User },
      { action: Action.Create, subject: Subject.Event },
      { action: Action.Read, subject: Subject.Event },
      { action: Action.Update, subject: Subject.Event },
      { action: Action.Delete, subject: Subject.Event },
    ];
    for (const p of permissions) {
      const existing = await this.permissionRepository.findOne({ where: p });
      if (!existing) {
        await this.permissionRepository.save(
          this.permissionRepository.create(p),
        );
      }
    }
  }

  private async seedSuperAdmin() {
    const superAdminRole = await this.findOrCreateRole('SUPER_ADMIN');
    if (superAdminRole.permissions.length === 0) {
      superAdminRole.permissions = await this.permissionRepository.find();
      await this.roleRepository.save(superAdminRole);
    }

    const superAdminEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL');
    let superAdmin = await this.userRepository.findOne({
      where: { email: superAdminEmail },
    });
    if (!superAdmin) {
      const superAdminPassword = this.configService.get<string>(
        'SUPER_ADMIN_PASSWORD',
      );
      if (superAdminEmail && superAdminPassword) {
        const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
        superAdmin = this.userRepository.create({
          email: superAdminEmail,
          password_hash: hashedPassword,
          name: 'Super Admin',
          roles: [superAdminRole],
          is_active: true,
        });
        await this.userRepository.save(superAdmin);
        this.logger.log(`Created SUPER_ADMIN user: ${superAdminEmail}`);
      }
    }
  }
}
