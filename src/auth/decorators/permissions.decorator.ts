import { SetMetadata } from '@nestjs/common';
import { Action } from '../enums/action.enum';
import { Subjects } from '../casl/casl-ability.factory';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  action: Action;
  subject: Subjects;
}

export const RequiredPermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
