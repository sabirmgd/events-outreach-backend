import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserService } from '../user/user.service';
import { Role } from './enums/role.enum';

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
      where: { email },
      select: ['id', 'email', 'password', 'name', 'role']
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Only allow admin users to login to admin-ui
    if (user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Access denied. Admin role required.');
    }

    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role 
    };

    const tokens = await this.generateTokens(payload);
    
    // Store refresh token hash in database
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    const { password: userPassword, ...userWithoutPassword } = user;
    
    return {
      ...tokens,
      user: userWithoutPassword
    };
  }

  async logout(user: any) {
    if (user && user.sub) {
      await this.userRepository.update(user.sub, {
        refreshToken: undefined
      });
    }
    return { message: 'Logged out successfully' };
  }

  async refreshToken(refreshDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(
        refreshDto.refresh_token,
        { secret: this.configService.get('JWT_REFRESH_SECRET') }
      );

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'email', 'role', 'refreshToken']
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshDto.refresh_token,
        user.refreshToken
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { 
        sub: user.id, 
        email: user.email,
        role: user.role 
      };

      const tokens = await this.generateTokens(newPayload);
      await this.updateRefreshToken(user.id, tokens.refresh_token);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(payload: any) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '12h',
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

  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }
}
