import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { OutreachSequence } from './entities/outreach-sequence.entity';
import { OutreachStepTemplate } from './entities/outreach-step-template.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { PersonaModule } from '../persona/persona.module';
import { EventModule } from '../event/event.module';
import { AdminOutreachController } from './admin-outreach.controller';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';
import { CompanyModule } from '../company/company.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { SignalModule } from '../signal/signal.module';
import { ScheduledAction } from './entities/scheduled-action.entity';
import { SchedulingService } from './scheduling.service';
import { ActionProcessor } from './processors/action.processor';
import { ClientsModule } from '../clients/clients.module';
import { EmailSender } from '../organization/entities/email-sender.entity';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutreachSequence,
      OutreachStepTemplate,
      Conversation,
      Message,
      ScheduledAction,
      EmailSender, // Add EmailSender since ActionProcessor needs it
    ]),
    ConfigModule,
    PersonaModule,
    CompanyModule,
    forwardRef(() => EventModule),
    UserModule,
    AuthModule,
    SignalModule,
    ClientsModule,
    OrganizationModule,
  ],
  controllers: [
    OutreachController,
    AdminOutreachController,
    ConversationController,
  ],
  providers: [
    OutreachService,
    ConversationService,
    SchedulingService,
    ActionProcessor,
  ],
  exports: [
    OutreachService,
    ConversationService,
    SchedulingService,
    ActionProcessor, // Export ActionProcessor so other modules can use it
  ],
})
export class OutreachModule {}
