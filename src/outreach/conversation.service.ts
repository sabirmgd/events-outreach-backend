import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { FindConversationsDto } from './dto/find-conversations.dto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  async findAll(
    organizationId: string,
    query: FindConversationsDto,
  ): Promise<Conversation[]> {
    const qb = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.person', 'person')
      .leftJoinAndSelect('person.companyRoles', 'companyRoles')
      .leftJoinAndSelect('companyRoles.company', 'company')
      .leftJoinAndSelect('conversation.sequence', 'sequence')
      .where('sequence.organization.id = :organizationId', { organizationId });

    if (query.search) {
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('person.first_name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('person.last_name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('company.name ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }

    if (query.stage) {
      qb.andWhere('conversation.stage = :stage', { stage: query.stage });
    }

    if (query.temperature) {
      qb.andWhere('conversation.temperature = :temperature', {
        temperature: query.temperature,
      });
    }

    if (query.automationStatus) {
      qb.andWhere('conversation.automation_status = :automationStatus', {
        automationStatus: query.automationStatus,
      });
    }

    // We will need to adjust this when we have persona models.
    // if (query.personaId) {
    //   qb.andWhere('person.persona.id = :personaId', { personaId: query.personaId });
    // }

    return qb.getMany();
  }
}
