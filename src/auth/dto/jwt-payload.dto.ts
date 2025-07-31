export class JwtPayload {
  sub: number;
  email: string;
  roles: string[];
  organizationId: string | null;
  teamId: string | null;
  iat?: number;
  exp?: number;
}
