import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignalController } from './signal.controller';
import { SignalService } from './signal.service';
import { SignalExecutionService } from './signal-execution.service';
import { Signal } from './entities/signal.entity';
import { SignalExecution } from './entities/signal-execution.entity';
import { AgentModule } from '../agent/agent.module';
import { PromptsModule } from '../prompts/prompts.module';
import { EventModule } from '../event/event.module';
import { CompanyModule } from '../company/company.module';
import { PersonaModule } from '../persona/persona.module';
import { GeographyModule } from '../geography/geography.module';
import { EventSponsor } from '../event/entities/event-sponsor.entity';
import { CompanyPersonRole } from '../persona/entities/company-person-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Signal,
      SignalExecution,
      EventSponsor,
      CompanyPersonRole,
    ]),
    AgentModule,
    PromptsModule,
    forwardRef(() => EventModule),
    forwardRef(() => CompanyModule),
    forwardRef(() => PersonaModule),
    forwardRef(() => GeographyModule),
  ],
  controllers: [SignalController],
  providers: [SignalService, SignalExecutionService],
  exports: [SignalService, SignalExecutionService],
})
export class SignalModule {}
