export class JwtPayload {
  sub: number;
  username?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}
