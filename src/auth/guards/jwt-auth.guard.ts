import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../dto/jwt-payload.dto';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any): any {
    if (info && info instanceof Error) {
      this.logger.error(`JWT Validation Error: ${info.message}`, info.stack);
    }

    if (err || !user) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const infoMessage = info instanceof Error ? info.message : String(info);
      this.logger.error(
        `Authentication failed. Error: ${errMessage}, Info: ${infoMessage}`,
      );
      throw err || new UnauthorizedException();
    }

    const typedUser = user as JwtPayload;
    this.logger.log(`Authentication successful for user: ${typedUser.email}`);
    return typedUser;
  }
}
