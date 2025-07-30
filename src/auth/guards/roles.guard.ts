import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, RoleHierarchy } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    const userRole = user.role as Role;
    const userRoleLevel = RoleHierarchy[userRole] || 0;

    // Check if user has any of the required roles or a higher role
    return requiredRoles.some((role) => {
      const requiredRoleLevel = RoleHierarchy[role] || 0;
      return userRoleLevel >= requiredRoleLevel;
    });
  }
}
