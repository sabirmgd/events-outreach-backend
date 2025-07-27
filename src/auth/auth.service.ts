import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { JwtPayload } from './dto/jwt-payload.dto';
import { Permission } from './entities/permission.entity';
import { JWTPermission } from './dto/jwt-payload.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    this.logger.log(`Attempting to validate user: ${email}`);
    const user = await this.userService.findOneByEmail(email);

    if (!user) {
      this.logger.warn(`Validation failed: User not found with email ${email}`);
      throw new UnauthorizedException();
    }

    const isPasswordMatch = await bcrypt.compare(pass, user.password_hash);
    if (isPasswordMatch) {
      this.logger.log(`Validation successful for user: ${email}`);
      // We remove the password hash from the user object before returning
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...result } = user;
      return result;
    } else {
      this.logger.warn(
        `Validation failed: Password mismatch for user ${email}`,
      );
    }

    throw new UnauthorizedException();
  }

  login(user: User) {
    const permissions = user.roles.flatMap((role) => role.permissions);
    // Create a cleaner permission object without id/timestamps for the token
    const uniquePermissions: JWTPermission[] = Array.from(
      new Set(
        permissions.map((p: Permission) =>
          JSON.stringify({ action: p.action, subject: p.subject }),
        ),
      ),
    ).map((p) => JSON.parse(p as string));

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organization?.id ?? null,
      teamId: user.team?.id ?? null,
      roles: user.roles.map((role) => role.name),
      permissions: uniquePermissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
