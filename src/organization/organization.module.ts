import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { Team } from './entities/team.entity';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { EmailSender } from './entities/email-sender.entity';
import { LinkedInAccount } from './entities/linkedin-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, Team, EmailSender, LinkedInAccount]),
    UserModule,
    AuthModule,
  ],
  providers: [OrganizationService],
  controllers: [OrganizationController],
  exports: [OrganizationService],
})
export class OrganizationModule {}
