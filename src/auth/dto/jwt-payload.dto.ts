import { Permission as PermissionEntity } from '../entities/permission.entity';

// We define a simpler Permission type for the payload to avoid circular dependencies
// and to ensure the required fields are present.
export type JWTPermission = Omit<
  PermissionEntity,
  'id' | 'created_at' | 'updated_at'
>;

export class JwtPayload {
  sub: string; // User ID (now a UUID string)
  email: string;
  organizationId: string | null;
  teamId: string | null;
  roles: string[];
  permissions: JWTPermission[];
}
