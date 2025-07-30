import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, { any: permissions });

export const RequireAllPermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, { all: permissions });
