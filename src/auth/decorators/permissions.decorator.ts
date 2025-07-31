import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';
import { Action } from '../enums/action.enum';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  action: Action;
  subject: any;
}

export const RequirePermissions = (...permissions: (Permission | RequiredPermission)[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, { any: permissions });

export const RequireAllPermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, { all: permissions });
