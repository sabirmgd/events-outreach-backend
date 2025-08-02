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
import {
  Signal,
  SignalType,
  SignalFrequency,
  SignalStatus,
} from '../signal/entities/signal.entity';
import { SignalExecution } from '../signal/entities/signal-execution.entity';
import { OutreachSequence } from '../outreach/entities/outreach-sequence.entity';
import { OutreachStepTemplate } from '../outreach/entities/outreach-step-template.entity';
import { Conversation } from '../outreach/entities/conversation.entity';
import { Message } from '../outreach/entities/message.entity';
import { ConversationStage } from '../outreach/enums/conversation-stage.enum';
import { ConversationAutomationStatus } from '../outreach/enums/conversation-automation-status.enum';
import { ProspectTemperature } from '../outreach/enums/prospect-temperature.enum';
import { Venue } from '../geography/entities/venue.entity';

// Contact and channel interfaces
interface SeedContactChannel {
  type: string;
  value: string;
  validation_status: string;
}

interface SeedContact {
  full_name: string;
  first_name: string;
  last_name: string;
  linkedin_url: string;
  seniority: string;
  current_title: string;
  location_text: string;
  source_confidence: number;
  role_title: string;
  role_category: string;
  is_decision_maker: boolean;
  start_date: string;
  contact_channels: SeedContactChannel[];
}

// Company interfaces
interface SeedCompany {
  name: string;
  legal_name: string;
  website: string;
  linkedin_url: string;
  crunchbase_url: string;
  employee_range: string;
  revenue_range: string;
  primary_industry: string;
  description: string;
  hq_city: {
    name: string;
    country_code: string;
  };
}

interface SeedSponsor {
  sponsor_tier: string;
  is_past_sponsor: boolean;
  company: SeedCompany;
}

// Event interfaces
interface SeedVenue {
  name: string;
  address: string;
  lat: number;
  lon: number;
  normalized_name: string;
}

interface SeedEvent {
  name: string;
  start_dt: string;
  end_dt: string;
  website_url: string;
  status: string;
  timezone: string;
  expected_attendance_int: number;
  size_band: string;
  description_text: string;
  venue: SeedVenue;
  city: {
    name: string;
    country_code: string;
  };
}

// Outreach interfaces
interface SeedOutreachStep {
  applies_to_stage: string;
  channel: string;
  channel_strategy: string;
  use_ai_generation: boolean;
  message_length: 'short' | 'medium' | 'long';
  day_offset: number;
  subject_template?: string;
  body_template: string;
  max_retries: number;
}

interface SeedOutreachSequence {
  name: string;
  objective: string;
  discovery_prompt: string;
  outreach_context: string;
  template_variables: Record<string, string>;
  status: string;
  steps: SeedOutreachStep[];
}

// Signal interfaces
interface SeedSignal {
  name: string;
  description: string;
  type: SignalType;
  status: string;
  configuration: any;
  schedule: {
    frequency: SignalFrequency;
    time?: string;
    timezone?: string;
    enabled: boolean;
  };
  stats: {
    totalExecutions: number;
    totalEventsFound: number;
    totalCompaniesIdentified: number;
    totalContactsDiscovered: number;
    totalMessagesSent: number;
    totalResponses: number;
    totalMeetingsBooked: number;
  };
}

// Organization interfaces
interface SeedOrganization {
  name: string;
  admin: {
    name: string;
    email: string;
    password: string;
  };
}

// File-specific interfaces
interface OrganizationsData {
  organizations: SeedOrganization[];
}

interface SignalsData {
  signals: Array<{
    organizationName: string;
    signals: SeedSignal[];
  }>;
}

interface EventsData {
  events: Array<{
    signalName: string;
    organizationName: string;
    events: SeedEvent[];
  }>;
}

interface CompaniesData {
  companies: Array<{
    eventName: string;
    sponsors: SeedSponsor[];
  }>;
}

interface PersonasData {
  personas: Array<{
    companyName: string;
    contacts: SeedContact[];
  }>;
}

interface OutreachSequencesData {
  outreachSequences: Array<{
    signalName: string;
    organizationName: string;
    sequence: SeedOutreachSequence;
  }>;
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
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
    @InjectRepository(SignalExecution)
    private readonly signalExecutionRepository: Repository<SignalExecution>,
    @InjectRepository(OutreachSequence)
    private readonly outreachSequenceRepository: Repository<OutreachSequence>,
    @InjectRepository(OutreachStepTemplate)
    private readonly outreachStepTemplateRepository: Repository<OutreachStepTemplate>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    console.log('onModuleInit');
    console.log('RUN_SEEDS', 'true');
    // Disable automatic seeding - should be run manually after migrations
    const shouldSeed = this.configService.get<string>('RUN_SEEDS') === 'true';
    if (!shouldSeed) {
      this.logger.log(
        'Skipping database seeding (RUN_SEEDS is not set to true)',
      );
      return;
    }

    this.logger.log('Starting database seeding process...');
    await this.seedPermissions();
    await this.seedSuperAdmin();
    await this.seedFromDataFile();
    this.logger.log('Database seeding completed successfully.');
  }

  private async seedFromDataFile() {
    // Load all data files
    // Use process.cwd() to get the project root, then navigate to the seed data
    const seedDataDir = path.join(process.cwd(), 'dist', 'admin', 'seed-data');
    this.logger.log(`Looking for seed data in: ${seedDataDir}`);

    // 1. Seed Organizations
    const orgFilePath = path.join(seedDataDir, 'organizations.json');
    this.logger.log(`Attempting to load organizations from: ${orgFilePath}`);
    const orgsData = this.loadDataFile<OrganizationsData>(orgFilePath);
    if (!orgsData) {
      this.logger.warn(`Organizations data file not found. Skipping.`);
      return;
    }

    const organizations = new Map<string, Organization>();
    const adminUsers = new Map<string, User>();

    for (const orgData of orgsData.organizations) {
      const org = await this.seedOrganizationWithAdmin(orgData);
      organizations.set(org.organization.name, org.organization);
      adminUsers.set(org.organization.name, org.admin);
    }

    // 2. Seed Signals
    const signalsData = this.loadDataFile<SignalsData>(
      path.join(seedDataDir, 'signals.json'),
    );
    if (!signalsData) return;

    const signals = new Map<string, Signal>();

    for (const orgSignals of signalsData.signals) {
      const organization = organizations.get(orgSignals.organizationName);
      const adminUser = adminUsers.get(orgSignals.organizationName);

      if (!organization || !adminUser) {
        this.logger.warn(
          `Organization ${orgSignals.organizationName} not found. Skipping signals.`,
        );
        continue;
      }

      for (const signalData of orgSignals.signals) {
        const signal = await this.findOrCreateSignal(
          signalData,
          organization,
          adminUser,
        );
        signals.set(`${organization.name}:${signal.name}`, signal);
      }
    }

    // 3. Seed Events
    const eventsData = this.loadDataFile<EventsData>(
      path.join(seedDataDir, 'events.json'),
    );
    if (!eventsData) return;

    const events = new Map<string, Event>();

    for (const signalEvents of eventsData.events) {
      const signal = signals.get(
        `${signalEvents.organizationName}:${signalEvents.signalName}`,
      );

      if (!signal) {
        this.logger.warn(
          `Signal ${signalEvents.signalName} not found. Skipping events.`,
        );
        continue;
      }

      for (const eventData of signalEvents.events) {
        const event = await this.seedEvent(eventData, signal);
        events.set(event.name, event);
      }
    }

    // 4. Seed Companies and Sponsors
    const companiesData = this.loadDataFile<CompaniesData>(
      path.join(seedDataDir, 'companies.json'),
    );
    if (!companiesData) return;

    const companies = new Map<string, Company>();
    const companyToOrganization = new Map<string, Organization>();

    for (const eventCompanies of companiesData.companies) {
      const event = events.get(eventCompanies.eventName);

      if (!event) {
        this.logger.warn(
          `Event ${eventCompanies.eventName} not found. Skipping sponsors.`,
        );
        continue;
      }

      for (const sponsorData of eventCompanies.sponsors) {
        const company = await this.seedCompanyWithSponsor(sponsorData, event);
        companies.set(company.name, company);

        // Track which organization this company belongs to (via event -> signal -> organization)
        const eventWithRelations = await this.eventRepository.findOne({
          where: { id: event.id },
          relations: ['signal', 'signal.organization'],
        });
        if (eventWithRelations?.signal?.organization) {
          companyToOrganization.set(
            company.name,
            eventWithRelations.signal.organization,
          );
        }
      }
    }

    // 5. Seed Personas
    const personasData = this.loadDataFile<PersonasData>(
      path.join(seedDataDir, 'personas.json'),
    );
    if (!personasData) return;

    const personas = new Map<string, Person[]>();

    for (const companyPersonas of personasData.personas) {
      const company = companies.get(companyPersonas.companyName);

      if (!company) {
        this.logger.warn(
          `Company ${companyPersonas.companyName} not found. Skipping personas.`,
        );
        continue;
      }

      const organization = companyToOrganization.get(company.name);
      if (!organization) {
        this.logger.warn(
          `Organization not found for company ${company.name}. Skipping personas.`,
        );
        continue;
      }

      const companyContacts: Person[] = [];
      for (const contactData of companyPersonas.contacts) {
        const person = await this.seedPersonWithRole(
          contactData,
          company,
          organization,
        );
        companyContacts.push(person);
      }
      personas.set(company.name, companyContacts);
    }

    // 6. Seed Outreach Sequences
    const outreachData = this.loadDataFile<OutreachSequencesData>(
      path.join(seedDataDir, 'outreach-sequences.json'),
    );
    if (!outreachData) return;

    for (const signalOutreach of outreachData.outreachSequences) {
      const signal = signals.get(
        `${signalOutreach.organizationName}:${signalOutreach.signalName}`,
      );

      if (!signal) {
        this.logger.warn(
          `Signal ${signalOutreach.signalName} not found. Skipping outreach sequence.`,
        );
        continue;
      }

      const sequence = await this.seedOutreachSequence(
        signalOutreach.sequence,
        signal,
      );

      // Create sample conversations for some personas
      if (signal.name === 'Enterprise Tech Conference Signal') {
        const johnSmith = await this.personRepository.findOne({
          where: {
            linkedin_url: 'https://www.linkedin.com/in/sharanjm/',
            full_name: 'John Smith',
          },
        });
      }
    }
  }

  private loadDataFile<T>(filePath: string): T | null {
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Data file not found at ${filePath}. Skipping.`);
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent) as T;
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
        password: hashedPassword,
        is_active: true,
        organization,
        team,
      });
      user.roles = [role];
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

  private async findOrCreateSignal(
    signalData: SeedSignal,
    organization: Organization,
    user: User,
  ): Promise<Signal> {
    let signal = await this.signalRepository.findOne({
      where: { name: signalData.name, organization: { id: organization.id } },
    });
    if (!signal) {
      this.logger.log(`Creating signal: ${signalData.name}`);
      signal = this.signalRepository.create({
        name: signalData.name,
        description: signalData.description,
        type: signalData.type,
        status: SignalStatus.ACTIVE,
        organization,
        createdById: user.id,
        configuration: signalData.configuration,
        schedule: signalData.schedule,
        stats: signalData.stats,
      });
      await this.signalRepository.save(signal);
    }
    return signal;
  }

  private async findOrCreateEvent(
    eventData: SeedEvent,
    signal: Signal,
    city: City,
  ): Promise<Event> {
    let event = await this.eventRepository.findOne({
      where: { name: eventData.name, signal: { id: signal.id } },
    });
    if (!event) {
      this.logger.log(`Creating event: ${eventData.name}`);
      // Note: The Event entity doesn't have all these fields in the current schema
      // We're only using the fields that exist
      event = this.eventRepository.create({
        name: eventData.name,
        start_dt: new Date(eventData.start_dt),
        end_dt: new Date(eventData.end_dt),
        website_url: eventData.website_url,
        signal,
        city,
        status: eventData.status,
      });
      await this.eventRepository.save(event);
    }
    return event;
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

  private async findOrCreatePerson(
    contactData: SeedContact,
    organization: Organization,
  ): Promise<Person> {
    let person = await this.personRepository.findOne({
      where: { linkedin_url: contactData.linkedin_url },
    });
    if (!person) {
      this.logger.log(`Creating person: ${contactData.full_name}`);
      person = this.personRepository.create({
        full_name: contactData.full_name,
        first_name: contactData.first_name,
        last_name: contactData.last_name,
        linkedin_url: contactData.linkedin_url,
        seniority: contactData.seniority,
        current_title: contactData.current_title,
        location_text: contactData.location_text,
        source_confidence: contactData.source_confidence,
        organization,
      });
      await this.personRepository.save(person);
    }
    return person;
  }

  // New helper methods for comprehensive seeding
  private async seedOrganizationWithAdmin(
    orgData: SeedOrganization,
  ): Promise<{ organization: Organization; admin: User }> {
    const organization = await this.findOrCreateOrganization(orgData.name);
    const team = await this.findOrCreateTeam('General', organization);
    const adminRole = await this.findOrCreateRole('ORGANIZATION_ADMIN');
    const adminUser = await this.findOrCreateAdminUser(
      orgData.admin,
      organization,
      team,
      adminRole,
    );

    return { organization, admin: adminUser };
  }

  private async seedEvent(
    eventData: SeedEvent,
    signal: Signal,
  ): Promise<Event> {
    const city = await this.findOrCreateCity(
      eventData.city.name,
      eventData.city.country_code,
    );

    const venue = await this.findOrCreateVenue(eventData.venue, city);

    let event = await this.eventRepository.findOne({
      where: { name: eventData.name, signal: { id: signal.id } },
    });

    if (!event) {
      this.logger.log(`Creating event: ${eventData.name}`);
      event = this.eventRepository.create({
        name: eventData.name,
        start_dt: new Date(eventData.start_dt),
        end_dt: new Date(eventData.end_dt),
        website_url: eventData.website_url,
        status: eventData.status,
        venue,
        city,
        signal,
      });
      await this.eventRepository.save(event);
    }

    return event;
  }

  private async findOrCreateVenue(
    venueData: SeedVenue,
    city: City,
  ): Promise<Venue> {
    let venue = await this.venueRepository.findOne({
      where: { normalized_name: venueData.normalized_name },
    });

    if (!venue) {
      this.logger.log(`Creating venue: ${venueData.name}`);
      venue = this.venueRepository.create({
        name: venueData.name,
        address: venueData.address,
        lat: venueData.lat,
        lon: venueData.lon,
        normalized_name: venueData.normalized_name,
        city,
      });
      await this.venueRepository.save(venue);
    }

    return venue;
  }

  private async seedCompanyWithSponsor(
    sponsorData: SeedSponsor,
    event: Event,
  ): Promise<Company> {
    const companyData = sponsorData.company;
    const hqCity = await this.findOrCreateCity(
      companyData.hq_city.name,
      companyData.hq_city.country_code,
    );

    let company = await this.companyRepository.findOne({
      where: { name: companyData.name },
    });

    if (!company) {
      this.logger.log(`Creating company: ${companyData.name}`);
      company = this.companyRepository.create({
        name: companyData.name,
        legal_name: companyData.legal_name,
        website: companyData.website,
        linkedin_url: companyData.linkedin_url,
        crunchbase_url: companyData.crunchbase_url,
        employee_range: companyData.employee_range,
        revenue_range: companyData.revenue_range,
        primary_industry: companyData.primary_industry,
        description: companyData.description,
        hq_city: hqCity,
      });
      await this.companyRepository.save(company);
    }

    // Create sponsor relationship
    let sponsorLink = await this.eventSponsorRepository.findOne({
      where: { event: { id: event.id }, company: { id: company.id } },
    });

    if (!sponsorLink) {
      this.logger.log(`Linking ${company.name} as sponsor to ${event.name}`);
      sponsorLink = this.eventSponsorRepository.create({
        event,
        company,
        sponsor_tier: sponsorData.sponsor_tier,
        is_past_sponsor: sponsorData.is_past_sponsor,
      });
      await this.eventSponsorRepository.save(sponsorLink);
    }

    return company;
  }

  private async seedPersonWithRole(
    contactData: SeedContact,
    company: Company,
    organization: Organization,
  ): Promise<Person> {
    const person = await this.findOrCreatePerson(contactData, organization);

    // Create contact channels
    for (const channel of contactData.contact_channels) {
      await this.findOrCreateContactChannel(
        person,
        channel.type,
        channel.value,
        channel.validation_status,
      );
    }

    // Create company role
    let roleLink = await this.companyPersonRoleRepository.findOne({
      where: { person: { id: person.id }, company: { id: company.id } },
    });

    if (!roleLink) {
      this.logger.log(
        `Creating role for ${person.full_name} at ${company.name}`,
      );
      roleLink = this.companyPersonRoleRepository.create({
        person,
        company,
        role_title: contactData.role_title,
        role_category: contactData.role_category,
        is_decision_maker: contactData.is_decision_maker,
        start_date: new Date(contactData.start_date),
      });
      await this.companyPersonRoleRepository.save(roleLink);
    }

    return person;
  }

  private async seedOutreachSequence(
    sequenceData: SeedOutreachSequence,
    signal: Signal,
  ): Promise<OutreachSequence> {
    let sequence = await this.outreachSequenceRepository.findOne({
      where: { name: sequenceData.name, signal: { id: signal.id } },
    });

    if (!sequence) {
      this.logger.log(`Creating outreach sequence: ${sequenceData.name}`);
      sequence = this.outreachSequenceRepository.create({
        name: sequenceData.name,
        objective: sequenceData.objective,
        discovery_prompt: sequenceData.discovery_prompt,
        outreach_context: sequenceData.outreach_context,
        template_variables: sequenceData.template_variables,
        status: sequenceData.status,
        signal,
      });
      await this.outreachSequenceRepository.save(sequence);

      // Create steps
      for (const stepData of sequenceData.steps) {
        await this.findOrCreateOutreachStep(
          stepData,
          sequence,
          signal.organization,
        );
      }
    }

    return sequence;
  }

  private async findOrCreateOutreachStep(
    stepData: SeedOutreachStep,
    sequence: OutreachSequence,
    organization: Organization,
  ): Promise<OutreachStepTemplate> {
    let step = await this.outreachStepTemplateRepository.findOne({
      where: {
        sequence: { id: sequence.id },
        applies_to_stage: stepData.applies_to_stage,
        channel: stepData.channel,
      },
    });

    if (!step) {
      this.logger.log(
        `Creating outreach step: ${stepData.channel} for ${stepData.applies_to_stage}`,
      );
      step = this.outreachStepTemplateRepository.create({
        sequence,
        organization,
        applies_to_stage: stepData.applies_to_stage,
        channel: stepData.channel,
        channel_strategy: stepData.channel_strategy,
        use_ai_generation: stepData.use_ai_generation,
        message_length: stepData.message_length,
        day_offset: stepData.day_offset,
        subject_template: stepData.subject_template,
        body_template: stepData.body_template,
        max_retries: stepData.max_retries,
      });
      await this.outreachStepTemplateRepository.save(step);
    }

    return step;
  }

  private async createSampleConversation(
    sequence: OutreachSequence,
    person: Person,
  ): Promise<void> {
    let conversation = await this.conversationRepository.findOne({
      where: {
        sequence: { id: sequence.id },
        person: { id: person.id },
      },
    });

    if (!conversation) {
      this.logger.log(`Creating sample conversation for ${person.full_name}`);

      // Get the first step
      const firstStep = await this.outreachStepTemplateRepository.findOne({
        where: {
          sequence: { id: sequence.id },
          applies_to_stage: 'new',
        },
      });

      conversation = this.conversationRepository.create({
        person,
        sequence,
        automation_status: ConversationAutomationStatus.ACTIVE,
        stage: ConversationStage.CONTACTED,
        temperature: ProspectTemperature.WARM,
        current_step: firstStep || undefined,
        next_action_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      });
      await this.conversationRepository.save(conversation);

      // Create initial message
      if (firstStep) {
        const message = this.messageRepository.create({
          conversation,
          sender: 'agent',
          content:
            'Hi John, I noticed CloudScale Technologies is sponsoring Enterprise Tech Summit 2025. We help sponsors like you maximize conference ROI through AI-powered attendee engagement. Would love to connect and share some insights from similar events.',
          source_template: firstStep,
        });
        await this.messageRepository.save(message);
      }
    }
  }

  private async findOrCreateContactChannel(
    person: Person,
    type: string,
    value: string,
    validation_status?: string,
  ): Promise<ContactChannel> {
    let channel = await this.personRepository.manager
      .getRepository(ContactChannel)
      .findOne({ where: { person: { id: person.id }, type, value } });
    if (!channel) {
      this.logger.log(
        `Creating ${type} channel for person ${person.full_name}`,
      );
      channel = this.personRepository.manager
        .getRepository(ContactChannel)
        .create({
          person,
          type,
          value,
          validation_status: validation_status || 'valid',
        });
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
          password: hashedPassword,
          name: 'Super Admin',
          is_active: true,
        });
        superAdmin.roles = [superAdminRole];
        await this.userRepository.save(superAdmin);
        this.logger.log(`Created SUPER_ADMIN user: ${superAdminEmail}`);
      }
    }
  }
}
