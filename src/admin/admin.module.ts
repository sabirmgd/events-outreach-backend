import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SeedService } from './seed.service';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organization/entities/organization.entity';
import { Permission } from '../auth/entities/permission.entity';
import { Role } from '../auth/entities/role.entity';
import { User } from '../user/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { Team } from '../organization/entities/team.entity';
import { Event } from '../event/entities/event.entity';
import { City } from '../geography/entities/city.entity';
import { Company } from '../company/entities/company.entity';
import { EventSponsor } from '../event/entities/event-sponsor.entity';
import { Person } from '../persona/entities/person.entity';
import { CompanyPersonRole } from '../persona/entities/company-person-role.entity';
import { Signal } from '../signal/entities/signal.entity';

@Module({
  imports: [
    UserModule,
    AuthModule,
    TypeOrmModule.forFeature([
      Organization,
      Team,
      Permission,
      Role,
      User,
      Event,
      City,
      Company,
      EventSponsor,
      Person,
      CompanyPersonRole,
      Signal,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, SeedService],
})
export class AdminModule {}
