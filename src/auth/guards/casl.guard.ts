import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import {
  PERMISSIONS_KEY,
  RequiredPermission,
} from '../decorators/permissions.decorator';
import { JwtPayload } from '../dto/jwt-payload.dto';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.get<RequiredPermission[]>(
        PERMISSIONS_KEY,
        context.getHandler(),
      ) || [];

    const { user, params }: { user: JwtPayload; params: { id?: string } } =
      context.switchToHttp().getRequest();
    if (!user) return false;

    const ability = this.caslAbilityFactory.createForUser(user);

    for (const permission of requiredPermissions) {
      // First check if user has global permission (like SUPER_ADMIN with Action.Manage on 'all')
      if (ability.can(permission.action, permission.subject)) {
        continue;
      }

      // For specific resource permissions, check the resource if ID is provided
      if (params.id) {
        const resource = await this.permissionsService.findOneById(
          permission.subject as string,
          params.id,
        );
        if (!resource || ability.cannot(permission.action, resource)) {
          throw new ForbiddenException('Forbidden resource');
        }
      } else {
        // For list endpoints without ID, if user doesn't have global permission, deny access
        throw new ForbiddenException('Forbidden resource');
      }
    }

    return true;
  }
}
