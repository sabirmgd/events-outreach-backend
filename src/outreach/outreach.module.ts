import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutreachSequence } from './entities/outreach-sequence.entity';
import { OutreachStepTemplate } from './entities/outreach-step-template.entity';
import { OutreachMessageInstance } from './entities/outreach-message-instance.entity';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';
import { EventModule } from '../event/event.module';
import { PersonaModule } from '../persona/persona.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutreachSequence,
      OutreachStepTemplate,
      OutreachMessageInstance,
    ]),
    EventModule,
    PersonaModule,
    CompanyModule,
  ],
  providers: [OutreachService],
  controllers: [OutreachController],
  exports: [OutreachService],
})
export class OutreachModule {}
