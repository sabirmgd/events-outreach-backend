import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../enums/permission.enum';
import { Role } from '../enums/role.enum';
import { RolePermissions } from '../enums/role-permissions';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissionsMetadata = this.reflector.getAllAndOverride<
      Permission[] | { any?: Permission[]; all?: Permission[] }
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!permissionsMetadata) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      return false;
    }

    const userRole = user.role as Role;
    const userPermissions = this.getUserPermissions(userRole, user.permissions);

    // Handle different permission requirement types
    if (Array.isArray(permissionsMetadata)) {
      // Default: user needs ANY of the specified permissions
      return this.hasAnyPermission(userPermissions, permissionsMetadata);
    } else if (permissionsMetadata.any) {
      // User needs ANY of the specified permissions
      return this.hasAnyPermission(userPermissions, permissionsMetadata.any);
    } else if (permissionsMetadata.all) {
      // User needs ALL of the specified permissions
      return this.hasAllPermissions(userPermissions, permissionsMetadata.all);
    }

    return false;
  }

  private getUserPermissions(
    role: Role,
    customPermissions?: string[],
  ): Set<Permission> {
    const rolePermissions = RolePermissions[role] || [];
    const allPermissions = new Set<Permission>(rolePermissions);

    // Add any custom permissions assigned to the user
    if (customPermissions && Array.isArray(customPermissions)) {
      customPermissions.forEach((permission) => {
        if (Object.values(Permission).includes(permission as Permission)) {
          allPermissions.add(permission as Permission);
        }
      });
    }

    return allPermissions;
  }

  private hasAnyPermission(
    userPermissions: Set<Permission>,
    requiredPermissions: Permission[],
  ): boolean {
    return requiredPermissions.some((permission) =>
      userPermissions.has(permission),
    );
  }

  private hasAllPermissions(
    userPermissions: Set<Permission>,
    requiredPermissions: Permission[],
  ): boolean {
    return requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );
  }
}
