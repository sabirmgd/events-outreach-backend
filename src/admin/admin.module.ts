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

@Module({
  imports: [
    UserModule,
    AuthModule,
    TypeOrmModule.forFeature([Organization, Team, Permission, Role, User]),
  ],
  controllers: [AdminController],
  providers: [AdminService, SeedService],
})
export class AdminModule {}
