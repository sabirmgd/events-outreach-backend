import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutreachSequence } from './entities/outreach-sequence.entity';
import { OutreachStepTemplate } from './entities/outreach-step-template.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationController } from './conversation.controller';
import { OutreachService } from './outreach.service';
import { EventModule } from '../event/event.module';
import { PersonaModule } from '../persona/persona.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutreachSequence,
      OutreachStepTemplate,
      Conversation,
      Message,
    ]),
    EventModule,
    PersonaModule,
    CompanyModule,
  ],
  providers: [OutreachService],
  controllers: [ConversationController],
  exports: [OutreachService],
})
export class OutreachModule {}
