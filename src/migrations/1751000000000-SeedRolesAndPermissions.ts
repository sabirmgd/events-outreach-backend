import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRolesAndPermissions1751000000000
  implements MigrationInterface
{
  name = 'SeedRolesAndPermissions1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roles
    const superAdminRole = await queryRunner.query(`
      INSERT INTO "roles" ("name") VALUES ('SUPER_ADMIN') RETURNING id
    `);
    const adminRole = await queryRunner.query(`
      INSERT INTO "roles" ("name") VALUES ('ADMIN') RETURNING id
    `);
    const userRole = await queryRunner.query(`
      INSERT INTO "roles" ("name") VALUES ('USER') RETURNING id
    `);

    // Create permissions
    const subjects = [
      'User',
      'Organization',
      'Event',
      'Company',
      'Person',
      'OutreachSequence',
      'Conversation',
      'Meeting',
    ];
    const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

    const permissions = [];
    for (const subject of subjects) {
      for (const action of actions) {
        const result = await queryRunner.query(`
          INSERT INTO "permissions" ("action", "subject") 
          VALUES ('${action}', '${subject}') 
          RETURNING id
        `);
        permissions.push({ id: result[0].id, action, subject });
      }
    }

    // SUPER_ADMIN gets all permissions
    for (const permission of permissions) {
      await queryRunner.query(`
        INSERT INTO "roles_permissions_permissions" ("rolesId", "permissionsId")
        VALUES ('${superAdminRole[0].id}', '${permission.id}')
      `);
    }

    // ADMIN gets all permissions except User management
    for (const permission of permissions) {
      if (permission.subject !== 'User' || permission.action === 'READ') {
        await queryRunner.query(`
          INSERT INTO "roles_permissions_permissions" ("rolesId", "permissionsId")
          VALUES ('${adminRole[0].id}', '${permission.id}')
        `);
      }
    }

    // USER gets limited permissions
    const userPermissions = permissions.filter(
      (p) =>
        (p.subject === 'Event' &&
          ['CREATE', 'READ', 'UPDATE'].includes(p.action)) ||
        (p.subject === 'Company' && ['READ'].includes(p.action)) ||
        (p.subject === 'Person' && ['READ'].includes(p.action)) ||
        (p.subject === 'Organization' && p.action === 'READ'),
    );

    for (const permission of userPermissions) {
      await queryRunner.query(`
        INSERT INTO "roles_permissions_permissions" ("rolesId", "permissionsId")
        VALUES ('${userRole[0].id}', '${permission.id}')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all role-permission mappings
    await queryRunner.query(`DELETE FROM "roles_permissions_permissions"`);

    // Remove all permissions
    await queryRunner.query(`DELETE FROM "permissions"`);

    // Remove all roles
    await queryRunner.query(`DELETE FROM "roles"`);
  }
}
