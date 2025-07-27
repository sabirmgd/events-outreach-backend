import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { CaslModule } from './casl/casl.module';
import { CaslGuard } from './guards/casl.guard';
import { PermissionsService } from './permissions.service';
import { User } from '../user/entities/user.entity';
import { Organization } from '../organization/entities/organization.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
    CaslModule,
    TypeOrmModule.forFeature([User, Organization]),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    CaslGuard,
    PermissionsService,
  ],
  controllers: [AuthController],
  exports: [CaslModule, PermissionsService],
})
export class AuthModule {}
