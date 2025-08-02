import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '../organization/entities/organization.entity';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Event } from '../event/entities/event.entity';
import { Subject } from './enums/subject.enum';
import { Signal } from '../signal/entities/signal.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
  ) {}

  async findOneById(
    subject: string,
    id: string,
  ): Promise<Organization | User | Event | Signal | null> {
    switch (subject) {
      case Subject.Organization.toString():
        return this.organizationRepository.findOne({ where: { id } });
      case Subject.User.toString():
        return this.userRepository.findOne({ where: { id } });
      case Subject.Event.toString():
        return this.eventRepository.findOne({
          where: { id: Number(id) },
          relations: ['signal'],
        });
      case 'Signal':
        return this.signalRepository.findOne({ where: { id } });
      default:
        return null;
    }
  }
}
