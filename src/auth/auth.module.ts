import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { CaslGuard } from './guards/casl.guard';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { PermissionsService } from './permissions.service';
import { User } from '../user/entities/user.entity';
import { UserModule } from '../user/user.module';
import { Organization } from '../organization/entities/organization.entity';
import { Event } from '../event/entities/event.entity';
import { Signal } from '../signal/entities/signal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization, Event, Signal]),
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    PermissionsGuard,
    CaslGuard,
    CaslAbilityFactory,
    PermissionsService,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    RolesGuard,
    PermissionsGuard,
    CaslGuard,
    CaslAbilityFactory,
    PermissionsService,
  ],
})
export class AuthModule {}
