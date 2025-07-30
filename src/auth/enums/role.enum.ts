export enum Role {
  ADMIN = 'admin',
  OPS = 'ops',
  SALES = 'sales',
  VIEWER = 'viewer',
}

export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 100,
  [Role.OPS]: 50,
  [Role.SALES]: 30,
  [Role.VIEWER]: 10,
};
