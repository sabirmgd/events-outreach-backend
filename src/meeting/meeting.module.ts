import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { MeetingSource } from './entities/meeting-source.entity';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';
import { EventModule } from '../event/event.module';
import { CompanyModule } from '../company/company.module';
import { PersonaModule } from '../persona/persona.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, MeetingAttendee, MeetingSource]),
    EventModule,
    CompanyModule,
    PersonaModule,
    UserModule,
  ],
  providers: [MeetingService],
  controllers: [MeetingController],
  exports: [MeetingService],
})
export class MeetingModule {}
