import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../entities/permission.entity';
import { JwtPayload } from '../dto/jwt-payload.dto';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      Partial<Permission>[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required, access granted
    }

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!user || !user.permissions) {
      return false; // No user or permissions on the request
    }

    const userPermissions = user.permissions;

    // Check if the user has at least one of the required permissions
    return requiredPermissions.some((requiredPermission) =>
      userPermissions.some(
        (userPermission) =>
          userPermission.action === requiredPermission.action &&
          userPermission.subject === requiredPermission.subject,
      ),
    );
  }
}
