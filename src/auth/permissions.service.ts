import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '../organization/entities/organization.entity';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Subject } from './enums/subject.enum';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOneById(subject: string, id: string) {
    switch (subject) {
      case Subject.Organization.toString():
        return this.organizationRepository.findOne({ where: { id } });
      case Subject.User.toString():
        return this.userRepository.findOne({ where: { id } });
      default:
        return null;
    }
  }
}
