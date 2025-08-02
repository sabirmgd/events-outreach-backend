export class JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  organizationId: string | null;
  teamId: string | null;
  iat?: number;
  exp?: number;
}
