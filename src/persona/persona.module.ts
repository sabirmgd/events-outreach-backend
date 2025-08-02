import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Person } from './entities/person.entity';
import { ContactChannel } from './entities/contact-channel.entity';
import { CompanyPersonRole } from './entities/company-person-role.entity';
import { PersonaController } from './persona.controller';
import { PersonaService } from './persona.service';
import { CompanyModule } from '../company/company.module';
import { PERSONA_QUEUE } from '../queue/constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Person, ContactChannel, CompanyPersonRole]),
    BullModule.registerQueue({ name: PERSONA_QUEUE }),
    forwardRef(() => CompanyModule),
  ],
  providers: [PersonaService],
  controllers: [PersonaController],
  exports: [PersonaService],
})
export class PersonaModule {}
