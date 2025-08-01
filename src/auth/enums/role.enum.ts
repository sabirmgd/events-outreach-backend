export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPS = 'ops',
  SALES = 'sales',
  VIEWER = 'viewer',
}

export const RoleHierarchy: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 200,
  [Role.ADMIN]: 100,
  [Role.OPS]: 50,
  [Role.SALES]: 30,
  [Role.VIEWER]: 10,
};
