import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, pass: string): Promise<any> {
    // The login method in AuthService handles validation
    try {
      const result = await this.authService.login({ email, password: pass });
      return result.user;
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}
