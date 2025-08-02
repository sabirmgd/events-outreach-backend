import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import appConfig from './config/app.config';
import dbConfig from './config/db.config';
import { validationSchema } from './config/validation';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GeographyModule } from './geography/geography.module';
import { TagModule } from './tag/tag.module';
import { CompanyModule } from './company/company.module';
import { EventModule } from './event/event.module';
import { PersonaModule } from './persona/persona.module';
import { OutreachModule } from './outreach/outreach.module';
import { MeetingModule } from './meeting/meeting.module';
import { UserModule } from './user/user.module';
import { JobsModule } from '@jobs/jobs.module';
import { ToolsModule } from '@tools/tools.module';
import { QueueModule } from './queue/queue.module';
import { ClientsModule } from './clients/clients.module';
import { PromptsModule } from './prompts/prompts.module';
import { AgentModule } from './agent/agent.module';
import { AgentsModule } from './agent/agents.module';
import { OrganizationModule } from './organization/organization.module';
import { AdminModule } from './admin/admin.module';
import { SignalModule } from './signal/signal.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'dev'}`, '.env'],
      validationSchema,
      load: [appConfig, dbConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('db.host'),
        port: config.get<number>('db.port'),
        username: config.get<string>('db.user'),
        password: config.get<string>('db.pass'),
        database: config.get<string>('db.name'),
        ssl: config.get<boolean>('db.ssl'),
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production', // auto-sync in dev
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    OrganizationModule,
    AdminModule,
    GeographyModule,
    TagModule,
    CompanyModule,
    EventModule,
    PersonaModule,
    OutreachModule,
    MeetingModule,
    UserModule,
    JobsModule,
    ToolsModule,
    QueueModule,
    ClientsModule,
    PromptsModule,
    AgentModule,
    AgentsModule,
    SignalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
