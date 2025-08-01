import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignalExecution, ExecutionStatus } from './entities/signal-execution.entity';
import { SignalService } from './signal.service';
import { AgentExecutionService } from '../agent/services/agent-execution.service';
import { PromptsService } from '../prompts/services/prompts.service';
import { ExecuteSignalDto } from './dto/execute-signal.dto';
import { DiscoverSignalDto } from './dto/discover-signal.dto';
import { SignalType } from './entities/signal.entity';
import { EventService } from '../event/event.service';
import { CompanyService } from '../company/company.service';
import { PersonaService } from '../persona/persona.service';
import { GeographyService } from '../geography/geography.service';
import { EventSponsor } from '../event/entities/event-sponsor.entity';
import { CompanyPersonRole } from '../persona/entities/company-person-role.entity';
import { AgentExecutionGateway } from '../agent/gateways/agent-execution.gateway';

@Injectable()
export class SignalExecutionService {
  private readonly logger = new Logger(SignalExecutionService.name);
  
  // Rate limiting configuration:
  // - Sponsor extraction: 2 events per batch, 3s delay between batches
  // - People enrichment: 3 companies per batch, 5s delay between batches
  // - Exponential backoff with 3 retries for rate limit errors
  // - Duplicate checking by normalized name, website, LinkedIn URL

  constructor(
    @InjectRepository(SignalExecution)
    private executionRepository: Repository<SignalExecution>,
    private signalService: SignalService,
    private agentExecutionService: AgentExecutionService,
    private promptsService: PromptsService,
    private eventService: EventService,
    private companyService: CompanyService,
    private personaService: PersonaService,
    private geographyService: GeographyService,
    @InjectRepository(EventSponsor)
    private eventSponsorRepository: Repository<EventSponsor>,
    @InjectRepository(CompanyPersonRole)
    private companyPersonRoleRepository: Repository<CompanyPersonRole>,
    private agentGateway: AgentExecutionGateway,
  ) {}

  async executeSignal(
    signalId: string,
    userId: string,
    dto: ExecuteSignalDto = {}
  ): Promise<SignalExecution> {
    const signal = await this.signalService.findOne(signalId);
    
    // Create execution record
    const execution = this.executionRepository.create({
      signalId,
      executedById: userId,
      status: ExecutionStatus.RUNNING,
      parameters: dto,
    });
    
    await this.executionRepository.save(execution);
    
    // Execute asynchronously
    this.runExecution(execution.id, signal).catch((error) => {
      this.logger.error(`Execution ${execution.id} failed:`, error);
    });
    
    return execution;
  }

  private emitSignalProgress(signalId: string, data: any) {
    // Emit to multiple channels for compatibility
    this.agentGateway.server?.emit('execution_progress', {
      signalId,
      ...data,
      timestamp: new Date(),
    });
    this.agentGateway.server?.emit(`signal_${signalId}_progress`, {
      signalId,
      ...data,
      timestamp: new Date(),
    });
  }

  private async runExecution(executionId: string, signal: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (signal.type) {
        case SignalType.CONFERENCE:
          result = await this.executeConferenceSignal(signal);
          break;
          
        case SignalType.FUNDING:
          result = await this.executeFundingSignal(signal);
          break;
          
        case SignalType.HIRING:
          result = await this.executeHiringSignal(signal);
          break;
          
        default:
          throw new Error(`Unsupported signal type: ${signal.type}`);
      }
      
      // Update execution with results
      this.logger.log(`📊 Updating execution ${executionId} with results:`, {
        eventsCount: result.events?.length,
        companiesCount: result.companies?.length,
        contactsCount: result.contacts?.length,
        stats: result.stats
      });
      
      await this.executionRepository.update(executionId, {
        status: ExecutionStatus.COMPLETED,
        results: result,
        duration: Date.now() - startTime,
        completedAt: new Date(),
      });
      
      // Verify the update
      const updatedExecution = await this.executionRepository.findOne({
        where: { id: executionId }
      });
      this.logger.log(`✅ Execution updated. Results saved: ${updatedExecution?.results ? 'YES' : 'NO'}`);
      
      // Update signal stats
      await this.signalService.updateStats(signal.id, result.stats);
      
    } catch (error) {
      await this.executionRepository.update(executionId, {
        status: ExecutionStatus.FAILED,
        error: {
          message: error.message,
          stack: error.stack,
        },
        duration: Date.now() - startTime,
        completedAt: new Date(),
      });
    }
  }

  private async executeConferenceSignal(signal: any): Promise<any> {
    const { configuration } = signal;
    
    // Step 1: Discover events
    const searchQuery = this.buildConferenceSearchQuery(configuration);
    const agentResult = await this.agentExecutionService.executeWithProgress(
      'event-discovery',
      'searchEvents',
      {
        location: configuration.locations?.[0] || 'United States',
        city: configuration.locations?.[1],
        year: new Date().getFullYear(),
        topic: configuration.event_keywords?.[0] || 'technology',
      }
    );
    
    const eventDataArray = this.parseEventResults(agentResult.result);
    
    // 🚀 Log events found for debugging
    this.logger.log(`🎉 EVENTS DISCOVERED: Found ${eventDataArray.length} events!`);
    eventDataArray.forEach((event, i) => {
      this.logger.log(`Event ${i+1}: ${event.name} - ${event.date} - ${event.venue}`);
    });
    
    // 🚀 Emit WebSocket progress: Events found!
    this.emitSignalProgress(signal.id, {
      currentStep: 'events',
      status: 'processing',
      eventsFound: eventDataArray.length,
      message: `Found ${eventDataArray.length} events! Processing...`,
      events: eventDataArray.slice(0, 3).map(e => ({ 
        name: e.name, 
        date: e.date, 
        venue: e.venue 
      })) // Preview first 3 events
    });
    
    // Step 2: Save events to database
    const savedEvents = [];
    this.logger.log(`Processing ${eventDataArray.length} events from agent result`);
    
    for (const eventData of eventDataArray) {
      try {
        // Validate required fields
        if (!eventData || !eventData.name || eventData.name.trim() === '') {
          this.logger.warn(`Skipping event with missing name:`, eventData);
          continue;
        }
        
        // Find or create city
        const city = await this.geographyService.findOrCreateCity({
          name: eventData.location || 'Unknown',
          country: 'US', // TODO: Extract from location
        });
        
        // Parse the date from BAML format (e.g., "2025-10-14")
        let eventDate;
        try {
          eventDate = eventData.date ? new Date(eventData.date) : new Date();
          // Validate the date
          if (isNaN(eventDate.getTime())) {
            this.logger.warn(`Invalid date for event ${eventData.name}: ${eventData.date}, using current date`);
            eventDate = new Date();
          }
        } catch (error) {
          this.logger.warn(`Failed to parse date for event ${eventData.name}: ${eventData.date}, using current date`);
          eventDate = new Date();
        }

        // Create event
        const event = await this.eventService.create({
          name: eventData.name.trim(),
          start_dt: eventDate.toISOString(),
          end_dt: eventDate.toISOString(),
          website_url: eventData.website || '',
          city_id: city.id,
          status: 'planned',
        });
        
        savedEvents.push({
          id: event.id,
          name: event.name,
          date: event.start_dt,
          location: city.name,
          attendees: eventData.attendees || 0,
          venue: eventData.venue || '',
          website: event.website_url,
        });
      } catch (error) {
        this.logger.error(`Failed to save event ${eventData.name}:`, error);
      }
    }
    
    // 🚀 Log events saved and transition to sponsors
    this.logger.log(`✅ EVENTS SAVED: Successfully saved ${savedEvents.length} out of ${eventDataArray.length} events!`);
    this.logger.log(`🔄 TRANSITIONING TO SPONSORS: Starting sponsor extraction for ${savedEvents.length} events...`);
    
    // 🚀 Emit WebSocket progress: Events saved, moving to sponsors!
    this.emitSignalProgress(signal.id, {
      currentStep: 'sponsors',
      status: 'running',
      eventsCompleted: savedEvents.length,
      eventsFound: eventDataArray.length,
      eventsSaved: savedEvents.length,
      message: `Events saved! Extracting sponsors from ${savedEvents.length} events...`
    });
    
    // Step 3: Extract sponsors for all events in PARALLEL
    const savedCompanies: any[] = [];
    const companyMap = new Map<string, any>(); // Track by normalized name
    const companyWebsiteMap = new Map<string, any>(); // Track by domain
    
    // Process events in batches to avoid overwhelming the API and rate limits
    const BATCH_SIZE = 2; // Reduced from 5 to 2 to avoid rate limits
    const BATCH_DELAY = 3000; // 3 second delay between batches
    const eventBatches = [];
    for (let i = 0; i < savedEvents.length; i += BATCH_SIZE) {
      eventBatches.push(savedEvents.slice(i, i + BATCH_SIZE));
    }
    
    this.logger.log(`🚀 PARALLEL SPONSOR EXTRACTION: Processing ${savedEvents.length} events in ${eventBatches.length} batches`);
    
    for (const [batchIndex, eventBatch] of eventBatches.entries()) {
      this.logger.log(`Processing batch ${batchIndex + 1}/${eventBatches.length} with ${eventBatch.length} events`);
      
      // Add delay between batches to avoid rate limiting (except for first batch)
      if (batchIndex > 0) {
        this.logger.log(`⏳ Waiting ${BATCH_DELAY}ms before next batch to avoid rate limits...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
      
      // Emit progress update
      this.emitSignalProgress(signal.id, {
        currentStep: 'sponsors',
        status: 'running',
        eventsCompleted: savedEvents.length,
        message: `Extracting sponsors: Batch ${batchIndex + 1}/${eventBatches.length}...`,
        progress: Math.round(((batchIndex * BATCH_SIZE) / savedEvents.length) * 100)
      });
      
      // Extract sponsors for all events in this batch in parallel
      const sponsorPromises = eventBatch
        .filter(() => configuration.extract_sponsors)
        .map(async (event) => {
          // Check if event already has sponsors
          const existingSponsors = await this.eventSponsorRepository.find({
            where: { event: { id: event.id } },
            relations: ['company', 'company.hq_city']
          });

          if (existingSponsors.length > 0) {
            this.logger.log(`Event ${event.name} already has ${existingSponsors.length} sponsors, using cached data`);
            
            // Add existing companies to results without API call
            const sponsors = existingSponsors.map(sponsor => ({
              name: sponsor.company.name,
              website: sponsor.company.website || '',
              industry: sponsor.company.primary_industry || '',
              description: sponsor.company.description || '',
              headquarters: '',
              founded: null,
              employeesRange: sponsor.company.employee_range || ''
            }));
            
            // Also ensure the companies are added to savedCompanies with location
            for (const sponsor of existingSponsors) {
              const company = sponsor.company;
              const normalizedName = company.name?.trim().toLowerCase();
              const normalizedWebsite = company.website?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
              
              if (!companyMap.has(normalizedName) && (!normalizedWebsite || !companyWebsiteMap.has(normalizedWebsite))) {
                // Reload company with hq_city if needed
                let companyWithLocation = company;
                if (!company.hq_city && company.id) {
                  companyWithLocation = await this.companyService.findOne(company.id, ['hq_city']);
                }
                
                const companyData = {
                  id: companyWithLocation.id,
                  name: companyWithLocation.name,
                  domain: companyWithLocation.website || '',
                  industry: companyWithLocation.primary_industry || '',
                  size: companyWithLocation.employee_range || '',
                  location: companyWithLocation.hq_city ? `${companyWithLocation.hq_city.name}, ${companyWithLocation.hq_city.country_code}` : 'Unknown',
                };
                
                companyMap.set(normalizedName, companyData);
                if (normalizedWebsite) {
                  companyWebsiteMap.set(normalizedWebsite, companyData);
                }
                
                if (!savedCompanies.some(c => c.id === companyWithLocation.id)) {
                  savedCompanies.push(companyData);
                }
              }
            }
            
            return { event, sponsors };
          }
          
          // Only make API call if no sponsors exist
          let retries = 0;
          const maxRetries = 3;
          let backoffDelay = 2000; // Start with 2 seconds
          
          while (retries < maxRetries) {
            try {
              const sponsorResult = await this.agentExecutionService.executeWithProgress(
                'sponsor-extraction',
                'extractSponsors',
                {
                  eventName: event.name,
                  eventWebsite: event.website,
                  year: new Date().getFullYear(),
                }
              );
              
              return {
                event,
                sponsors: this.parseSponsorResults(sponsorResult.result)
              };
            } catch (error: any) {
              // Check if it's a rate limit error
              if (error.response?.status === 429 || error.message?.includes('rate limit')) {
                retries++;
                if (retries < maxRetries) {
                  this.logger.warn(`Rate limit hit for ${event.name}, retrying in ${backoffDelay}ms (attempt ${retries}/${maxRetries})`);
                  await new Promise(resolve => setTimeout(resolve, backoffDelay));
                  backoffDelay *= 2; // Exponential backoff
                  continue;
                }
              }
              this.logger.error(`Failed to extract sponsors for ${event.name} after ${retries} retries:`, error);
              return { event, sponsors: [] };
            }
          }
          
          return { event, sponsors: [] };
        });
      
      // Wait for all sponsor extractions in this batch to complete
      const batchResults = await Promise.all(sponsorPromises);
      
      // Process and save all sponsor companies from this batch
      for (const { event, sponsors } of batchResults) {
        for (const sponsorData of sponsors) {
          const normalizedName = sponsorData.name?.trim().toLowerCase();
          const normalizedWebsite = sponsorData.website?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
          
          // Check both name and website for duplicates
          if (!normalizedName || companyMap.has(normalizedName) || 
              (normalizedWebsite && companyWebsiteMap.has(normalizedWebsite))) {
            this.logger.log(`Skipping duplicate company: ${sponsorData.name}`);
            continue;
          }
          
          try {
            // Find or create company
            let company = await this.companyService.findByName(sponsorData.name);
            if (!company && sponsorData.website) {
              // Also check by website to avoid duplicates with slightly different names
              company = await this.companyService.findByWebsite(sponsorData.website);
            }
            
            if (!company) {
              company = await this.companyService.create({
                name: sponsorData.name.trim(),
                website: sponsorData.website || null,
                primary_industry: sponsorData.industry || configuration.industries?.[0] || 'Technology',
                description: sponsorData.description || null,
                employee_range: sponsorData.employeesRange || null
              });
            }
            
            // Check if event-sponsor relationship already exists
            const existingRelation = await this.eventSponsorRepository.findOne({
              where: {
                event: { id: event.id },
                company: { id: company.id }
              }
            });
            
            if (!existingRelation) {
              // Create event-sponsor relationship
              await this.eventSponsorRepository.save({
                event: { id: event.id },
                company: { id: company.id },
                sponsor_tier: 'sponsor',
              });
            }
            
            // Reload company with hq_city relation if needed
            if (!company.hq_city && company.id) {
              company = await this.companyService.findOne(company.id, ['hq_city']);
            }
            
            const companyData = {
              id: company.id,
              name: company.name,
              domain: company.website || '',
              industry: company.primary_industry || '',
              size: company.employee_range || '',
              location: company.hq_city ? `${company.hq_city.name}, ${company.hq_city.country_code}` : 'Unknown',
            };
            
            // Track by both normalized name and website
            companyMap.set(normalizedName, companyData);
            if (normalizedWebsite) {
              companyWebsiteMap.set(normalizedWebsite, companyData);
            }
            
            // Only add to savedCompanies if it's not already there
            if (!savedCompanies.some(c => c.id === company.id)) {
              savedCompanies.push(companyData);
            }
          } catch (error) {
            this.logger.error(`Failed to save company ${sponsorData.name}:`, error);
          }
        }
      }
    }
    
    // 🚀 Log sponsors saved and transition to people
    this.logger.log(`✅ SPONSORS SAVED: Successfully saved ${savedCompanies.length} companies from sponsors!`);
    this.logger.log(`🔄 TRANSITIONING TO PEOPLE: Finding contacts at ${savedCompanies.length} companies...`);
    
    // 🚀 Emit WebSocket progress: Sponsors saved, moving to people!
    this.emitSignalProgress(signal.id, {
      currentStep: 'people',
      status: 'running',
      companiesFound: savedCompanies.length,
      companiesSaved: savedCompanies.length,
      eventsCompleted: savedEvents.length,
      message: `Companies saved! Finding key contacts at ${savedCompanies.length} companies...`
    });
    
    // Step 5: Find target persons at companies in PARALLEL
    const savedContacts: any[] = [];
    const contactMap = new Map<string, any>(); // Track contacts by LinkedIn URL to avoid duplicates
    // Use configuration target functions or default to common C-suite roles
    const targetFunctions = configuration.target_functions && configuration.target_functions.length > 0 
      ? configuration.target_functions 
      : ['CEO', 'CTO', 'CMO'];
    
    // Process companies in batches to avoid overwhelming the API and rate limits
    const PEOPLE_BATCH_SIZE = 3; // Reduced from 10 to 3 to avoid rate limits
    const PEOPLE_BATCH_DELAY = 5000; // 5 second delay between batches
    const companyBatches = [];
    for (let i = 0; i < savedCompanies.length; i += PEOPLE_BATCH_SIZE) {
      companyBatches.push(savedCompanies.slice(i, i + PEOPLE_BATCH_SIZE));
    }
    
    this.logger.log(`🚀 PARALLEL PEOPLE ENRICHMENT: Processing ${savedCompanies.length} companies in ${companyBatches.length} batches`);
    
    for (const [batchIndex, companyBatch] of companyBatches.entries()) {
      this.logger.log(`Processing batch ${batchIndex + 1}/${companyBatches.length} with ${companyBatch.length} companies`);
      
      // Add delay between batches to avoid rate limiting (except for first batch)
      if (batchIndex > 0) {
        this.logger.log(`⏳ Waiting ${PEOPLE_BATCH_DELAY}ms before next batch to avoid rate limits...`);
        await new Promise(resolve => setTimeout(resolve, PEOPLE_BATCH_DELAY));
      }
      
      // Emit progress update
      this.emitSignalProgress(signal.id, {
        currentStep: 'people',
        status: 'running',
        companiesFound: savedCompanies.length,
        message: `Finding contacts: Batch ${batchIndex + 1}/${companyBatches.length}...`,
        progress: Math.round(((batchIndex * PEOPLE_BATCH_SIZE) / savedCompanies.length) * 100)
      });
      
      // Find people for all companies in this batch in parallel
      const peoplePromises = companyBatch.map(async (company) => {
        const MAX_CONTACTS_PER_COMPANY = 3;
        
        // Check existing contacts for this company
        const existingContacts = await this.companyPersonRoleRepository.find({
          where: { 
            company: { id: company.id },
            is_decision_maker: true
          },
          relations: ['person'],
          take: MAX_CONTACTS_PER_COMPANY
        });

        if (existingContacts.length >= MAX_CONTACTS_PER_COMPANY) {
          this.logger.log(`Company ${company.name} already has ${existingContacts.length} contacts, skipping API call`);
          
          // Return existing contacts
          const people = existingContacts.map(role => ({
            name: role.person.full_name,
            title: role.role_title || role.person.current_title,
            company: company.name,
            email: '', // Add if available in person entity
            phone: '',
            linkedinUrl: role.person.linkedin_url || '',
            bio: '',
            location: role.person.location_text || '',
            expertise: [],
            role: role.role_title || role.person.current_title
          }));
          
          return { company, people };
        }
        
        // Calculate how many more contacts we need
        const contactsNeeded = MAX_CONTACTS_PER_COMPANY - existingContacts.length;
        this.logger.log(`Company ${company.name} has ${existingContacts.length} contacts, need ${contactsNeeded} more`);
        
        let retries = 0;
        const maxRetries = 3;
        let backoffDelay = 2000; // Start with 2 seconds
        
        while (retries < maxRetries) {
          try {
            const peopleResult = await this.agentExecutionService.executeWithProgress(
              'people-enricher',
              'findCompanyPOCs',
              {
                companyName: company.name,
                companyWebsite: company.domain,
                industry: company.industry,
                targetFunctions: targetFunctions,
              }
            );
            
            const people = this.parseContactResults(peopleResult.result);
            
            // No need to filter anymore - the agent only returns people matching target functions
            return {
              company,
              people: people,
              existingCount: existingContacts.length
            };
          } catch (error: any) {
            // Check if it's a rate limit error
            if (error.response?.status === 429 || error.message?.includes('rate limit')) {
              retries++;
              if (retries < maxRetries) {
                this.logger.warn(`Rate limit hit for ${company.name}, retrying in ${backoffDelay}ms (attempt ${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                backoffDelay *= 2; // Exponential backoff
                continue;
              }
            }
            this.logger.error(`Failed to find people for ${company.name} after ${retries} retries:`, error);
            return { company, people: [], existingCount: existingContacts.length };
          }
        }
        
        return { company, people: [], existingCount: existingContacts.length };
      });
      
      // Wait for all people enrichments in this batch to complete
      const batchResults = await Promise.all(peoplePromises);
      
      // Process and save all people from this batch
      for (const { company, people, existingCount } of batchResults) {
        const MAX_CONTACTS_PER_COMPANY = 3;
        let contactsSavedForCompany = existingCount || 0; // Start with existing count
        
        // Sort people by priority (C-level first)
        const sortedPeople = people.sort((a: any, b: any) => {
          const priorityRoles = ['ceo', 'cto', 'cmo', 'coo', 'cfo'];
          const aPriority = priorityRoles.findIndex(role => 
            a.title.toLowerCase().includes(role));
          const bPriority = priorityRoles.findIndex(role => 
            b.title.toLowerCase().includes(role));
          
          // Lower index = higher priority, -1 means not found
          if (aPriority === -1 && bPriority === -1) return 0;
          if (aPriority === -1) return 1;
          if (bPriority === -1) return -1;
          return aPriority - bPriority;
        });
        
        for (const personData of sortedPeople) {
          // Check if we've reached the limit
          if (contactsSavedForCompany >= MAX_CONTACTS_PER_COMPANY) {
            this.logger.log(`Reached limit of ${MAX_CONTACTS_PER_COMPANY} contacts for ${company.name}, skipping remaining ${sortedPeople.length - contactsSavedForCompany} contacts`);
            break;
          }
          
          try {
            // Skip if missing required data
            if (!personData.name || !personData.title) {
              this.logger.warn(`Skipping person with missing data:`, personData);
              continue;
            }
            
            // Check if we've already processed this person (by LinkedIn URL)
            if (personData.linkedinUrl && contactMap.has(personData.linkedinUrl)) {
              this.logger.log(`Skipping duplicate contact: ${personData.name} (${personData.linkedinUrl})`);
              continue;
            }
            
            // Find or create person
            let person = await this.personaService.findByLinkedIn(personData.linkedinUrl);
            if (!person && personData.email) {
              person = await this.personaService.findByEmail(personData.email);
            }
            
            if (!person) {
              person = await this.personaService.create({
                full_name: personData.name.trim(),
                first_name: personData.name.split(' ')[0],
                last_name: personData.name.split(' ').slice(1).join(' '),
                current_title: personData.title,
                linkedin_url: personData.linkedinUrl || '',
                seniority: this.extractSeniority(personData.title),
              });
              this.logger.log(`Created new person: ${person.full_name}`);
            } else {
              this.logger.log(`Found existing person: ${person.full_name}`);
            }
            
            // Check if company-person relationship already exists
            const existingRole = await this.companyPersonRoleRepository.findOne({
              where: {
                company: { id: company.id },
                person: { id: person.id }
              }
            });
            
            if (!existingRole) {
              // Create company-person relationship
              await this.companyPersonRoleRepository.save({
                company: { id: company.id },
                person: { id: person.id },
                role_title: personData.title,
                role_category: this.getRoleCategory(personData.title),
                is_decision_maker: true,
              });
              
              // Only increment if relationship was created
              contactsSavedForCompany++;
            } else {
              this.logger.log(`Company-person relationship already exists for ${person.full_name} at ${company.name}`);
            }
            
            const contactData = {
              id: person.id,
              name: person.full_name,
              title: person.current_title,
              company: company.name,
              email: personData.email || '',
              linkedin: person.linkedin_url || '',
            };
            
            // Track by LinkedIn URL if available
            if (personData.linkedinUrl) {
              contactMap.set(personData.linkedinUrl, contactData);
            }
            
            // Only add to savedContacts if not already there
            if (!savedContacts.some(c => c.id === person.id)) {
              savedContacts.push(contactData);
            }
          } catch (error) {
            this.logger.error(`Failed to save person ${personData.name}:`, error);
          }
        }
      }
      
      // Emit intermediate progress with contacts found so far
      this.emitSignalProgress(signal.id, {
        currentStep: 'people',
        status: 'running',
        companiesFound: savedCompanies.length,
        contactsFound: savedContacts.length,
        message: `Found ${savedContacts.length} contacts so far...`,
        progress: Math.round((((batchIndex + 1) * PEOPLE_BATCH_SIZE) / savedCompanies.length) * 100)
      });
    }
    
    // 🚀 Log people saved and transition to outreach/completion
    this.logger.log(`✅ PEOPLE SAVED: Successfully saved ${savedContacts.length} contacts from ${savedCompanies.length} companies!`);
    this.logger.log(`🎉 SIGNAL EXECUTION COMPLETE: Found ${savedEvents.length} events → ${savedCompanies.length} companies → ${savedContacts.length} contacts`);
    
    // 🚀 Emit WebSocket progress: People saved, execution complete!
    this.emitSignalProgress(signal.id, {
      currentStep: 'outreach',
      status: 'completed',
      eventsFound: savedEvents.length,
      companiesFound: savedCompanies.length,
      contactsFound: savedContacts.length,
      message: `Execution complete! Found ${savedContacts.length} contacts at ${savedCompanies.length} companies from ${savedEvents.length} events.`
    });
    
    // Return structured results with database IDs
    return {
      events: savedEvents,
      companies: savedCompanies,
      contacts: savedContacts,
      stats: {
        eventsDiscovered: savedEvents.length,
        companiesFound: savedCompanies.length,
        contactsDiscovered: savedContacts.length,
        messagesGenerated: 0,
        messagesSent: 0,
      },
    };
  }

  private async executeFundingSignal(signal: any): Promise<any> {
    // Implementation for funding signals
    // This would integrate with company enrichment APIs
    return {
      events: [],
      companies: [],
      contacts: [],
      stats: {
        eventsDiscovered: 0,
        companiesFound: 0,
        contactsDiscovered: 0,
        messagesGenerated: 0,
        messagesSent: 0,
      },
    };
  }

  private async executeHiringSignal(signal: any): Promise<any> {
    const { configuration } = signal;
    
    // Execute people enricher agent
    const agentResult = await this.agentExecutionService.executeWithProgress(
      'people-enricher',
      'enrichPeople',
      {
        titles: configuration.positions,
        seniority: configuration.seniority,
        departments: configuration.departments,
      }
    );
    
    return {
      events: [],
      companies: [],
      contacts: this.parseContactResults(agentResult.result),
      stats: {
        eventsDiscovered: 0,
        companiesFound: 0,
        contactsDiscovered: agentResult.result?.length || 0,
        messagesGenerated: 0,
        messagesSent: 0,
      },
    };
  }

  async discoverSignal(dto: DiscoverSignalDto): Promise<any> {
    // Use AI to parse natural language into signal configuration
    const promptBody = await this.promptsService.getPublishedPromptBody('signal-discovery');
    
    // This would use the test prompt service or similar to process the natural language
    const configuration = await this.parseNaturalLanguageSignal(dto.prompt);
    
    if (dto.preview) {
      // Return preview results without saving
      return {
        suggested_configuration: configuration,
        preview_results: await this.previewSignalResults(configuration),
      };
    }
    
    return { suggested_configuration: configuration };
  }

  private buildConferenceSearchQuery(config: any): string {
    const parts = [];
    
    if (config.event_keywords?.length) {
      parts.push(config.event_keywords.join(' OR '));
    }
    
    if (config.industries?.length) {
      parts.push(`${config.industries.join(' OR ')} conference`);
    }
    
    if (config.min_attendees) {
      parts.push(`${config.min_attendees}+ attendees`);
    }
    
    return parts.join(' AND ');
  }

  private parseEventResults(rawResult: any): any[] {
    try {
      this.logger.log(`Agent returned ${Array.isArray(rawResult) ? rawResult.length : 'non-array'} result(s)`);
      this.logger.debug('Raw result type:', typeof rawResult);
      this.logger.debug('Raw result:', JSON.stringify(rawResult, null, 2));
      
      // The event discovery agent now returns structured arrays directly from BAML
      if (Array.isArray(rawResult)) {
        this.logger.log(`Using structured event array: ${rawResult.length} events`);
        if (rawResult.length > 0) {
          this.logger.debug('First event structure:', JSON.stringify(rawResult[0], null, 2));
        }
        return rawResult;
      }
      
      this.logger.warn('Expected array from event discovery agent, got:', typeof rawResult);
      return [];
    } catch (error) {
      this.logger.error('Failed to parse event results:', error);
      this.logger.error('Raw result was:', rawResult);
      return [];
    }
  }

  private parseSponsorResults(rawResult: any): any[] {
    try {
      this.logger.log(`Sponsor agent returned ${Array.isArray(rawResult) ? rawResult.length : 'non-array'} result(s)`);
      
      // The sponsor extraction agent returns structured Company objects directly from BAML
      if (Array.isArray(rawResult)) {
        this.logger.log(`Using structured sponsor array: ${rawResult.length} companies`);
        return rawResult.map(company => ({
          name: company.name || 'Unknown Company',
          website: company.website || '',
          industry: company.industry || '',
          description: company.description || '',
          headquarters: company.headquarters || '',
          founded: company.founded || null,
          employeesRange: company.employeesRange || ''
        }));
      }
      
      this.logger.warn('Expected array from sponsor extraction agent, got:', typeof rawResult);
      return [];
    } catch (error) {
      this.logger.error('Failed to parse sponsor results:', error);
      return [];
    }
  }

  private parseContactResults(rawResult: any): any[] {
    try {
      this.logger.log(`People agent returned ${Array.isArray(rawResult) ? rawResult.length : 'non-array'} result(s)`);
      
      // The people enricher agent returns structured Person objects directly from BAML
      if (Array.isArray(rawResult)) {
        this.logger.log(`Using structured contacts array: ${rawResult.length} people`);
        return rawResult.map(person => ({
          name: person.name || 'Unknown Person',
          title: person.title || '',
          company: person.company || '',
          email: person.email || '',
          phone: person.phone || '',
          linkedinUrl: person.linkedinUrl || '',
          bio: person.bio || '',
          location: person.location || '',
          expertise: person.expertise || [],
          role: person.role || person.title || ''
        }));
      }
      
      this.logger.warn('Expected array from people enricher agent, got:', typeof rawResult);
      return [];
    } catch (error) {
      this.logger.error('Failed to parse contact results:', error);
      return [];
    }
  }

  private async parseNaturalLanguageSignal(prompt: string): Promise<any> {
    // Use AI to parse the prompt into signal configuration
    // This is a simplified example
    const keywords = ['conference', 'funding', 'hiring', 'acquisition'];
    const type = keywords.find(k => prompt.toLowerCase().includes(k)) || 'conference';
    
    return {
      type,
      event_keywords: prompt.split(' ').filter(w => w.length > 4),
      min_attendees: 500,
      locations: ['United States'],
    };
  }

  private async previewSignalResults(configuration: any): Promise<any> {
    // Return mock preview results
    return {
      events: [
        {
          name: 'AI Summit 2024',
          date: '2024-03-15',
          location: 'San Francisco, CA',
          expected_attendees: 2500,
          relevance_score: 0.95,
        },
      ],
    };
  }

  async getActiveExecutions(): Promise<SignalExecution[]> {
    return await this.executionRepository.find({
      where: { status: ExecutionStatus.RUNNING },
      relations: ['signal'],
      order: { startedAt: 'DESC' },
    });
  }

  async getSignalExecutions(signalId: string, page: number = 1, limit: number = 10): Promise<{ data: SignalExecution[]; pagination?: any }> {
    const skip = (page - 1) * limit;
    
    const [data, total] = await this.executionRepository.findAndCount({
      where: { signalId },
      relations: ['signal', 'executedBy'],
      order: { startedAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getExecution(id: string): Promise<SignalExecution | null> {
    return await this.executionRepository.findOne({
      where: { id },
      relations: ['signal', 'executedBy'],
    });
  }

  async cancelExecution(id: string): Promise<boolean> {
    const result = await this.executionRepository.update(id, {
      status: ExecutionStatus.CANCELLED,
      completedAt: new Date(),
    });
    
    return (result.affected ?? 0) > 0;
  }

  private extractSeniority(title: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('ceo') || titleLower.includes('chief executive')) return 'C-Suite';
    if (titleLower.includes('cto') || titleLower.includes('chief technology')) return 'C-Suite';
    if (titleLower.includes('cmo') || titleLower.includes('chief marketing')) return 'C-Suite';
    if (titleLower.includes('cfo') || titleLower.includes('chief financial')) return 'C-Suite';
    if (titleLower.includes('vp') || titleLower.includes('vice president')) return 'VP';
    if (titleLower.includes('director')) return 'Director';
    if (titleLower.includes('head of')) return 'Director';
    if (titleLower.includes('manager')) return 'Manager';
    return 'Individual Contributor';
  }

  private getRoleCategory(title: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('marketing') || titleLower.includes('cmo')) return 'marketing';
    if (titleLower.includes('sales') || titleLower.includes('revenue')) return 'sales';
    if (titleLower.includes('partner') || titleLower.includes('alliance')) return 'partnerships';
    if (titleLower.includes('ceo') || titleLower.includes('cto') || titleLower.includes('cfo') || titleLower.includes('coo')) return 'c_level';
    return 'other';
  }
}