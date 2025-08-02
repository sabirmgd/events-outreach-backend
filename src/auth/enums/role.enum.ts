export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  OPS = 'ops',
  SALES = 'sales',
  VIEWER = 'viewer',
}

export const RoleHierarchy: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 200,
  [Role.ORGANIZATION_ADMIN]: 100,
  [Role.OPS]: 50,
  [Role.SALES]: 30,
  [Role.VIEWER]: 10,
};
