import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserService } from '../user/user.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private userService: UserService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email, is_active: true },
      select: ['id', 'email', 'password', 'name', 'is_active'],
      relations: ['roles', 'roles.permissions', 'organization', 'team'],
    });

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hasAdminRole = user.roles?.some(
      (role) =>
        role.name === 'ORGANIZATION_ADMIN' || role.name === 'SUPER_ADMIN',
    );
    if (!hasAdminRole) {
      throw new UnauthorizedException('Access denied. Admin role required.');
    }

    const permissions =
      user.roles?.flatMap((role) =>
        role.permissions.map((p) => p.action + ':' + p.subject),
      ) || [];
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles?.map((role) => role.name) || [],
      permissions: [...new Set(permissions)],
      organizationId: user.organization?.id || null,
      teamId: user.team?.id || null,
    };

    const tokens = await this.generateTokens(payload);

    await this.updateRefreshToken(user.id, tokens.refresh_token);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: userPassword, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const { token, password } = dto;

    const user = await this.userRepository.findOne({
      where: { invitationToken: token },
      relations: ['roles', 'roles.permissions', 'organization', 'team'],
    });

    if (!user) {
      throw new NotFoundException('Invitation token is invalid.');
    }

    if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
      throw new UnauthorizedException('Invitation token has expired.');
    }

    user.password = await bcrypt.hash(password, 10);
    user.is_active = true;
    user.invitationToken = undefined;
    user.invitationExpiresAt = undefined;

    await this.userRepository.save(user);

    const permissions =
      user.roles?.flatMap((role) =>
        role.permissions.map((p) => p.action + ':' + p.subject),
      ) || [];
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles?.map((role) => role.name) || [],
      permissions: [...new Set(permissions)],
      organizationId: user.organization?.id || null,
      teamId: user.team?.id || null,
    };

    const tokens = await this.generateTokens(payload);

    await this.updateRefreshToken(user.id, tokens.refresh_token);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: userPassword, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async logout(user: User) {
    if (user && user.id) {
      await this.userRepository.update(user.id, {
        refreshToken: undefined,
      });
    }
    return { message: 'Logged out successfully' };
  }

  async refreshToken(refreshDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(
        refreshDto.refresh_token,
        { secret: this.configService.get('JWT_REFRESH_SECRET') },
      );

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'email', 'refreshToken'],
        relations: ['roles', 'roles.permissions', 'organization', 'team'],
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshDto.refresh_token,
        user.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const permissions =
        user.roles?.flatMap((role) =>
          role.permissions.map((p) => p.action + ':' + p.subject),
        ) || [];
      const newPayload = {
        sub: user.id,
        email: user.email,
        roles: user.roles?.map((role) => role.name) || [],
        permissions: [...new Set(permissions)],
        organizationId: user.organization?.id || null,
        teamId: user.team?.id || null,
      };

      const tokens = await this.generateTokens(newPayload);
      await this.updateRefreshToken(user.id, tokens.refresh_token);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(payload: object) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m',
        secret: this.configService.get('JWT_SECRET'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      }),
    ]);

    return {
      access_token,
      refresh_token,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }
}
