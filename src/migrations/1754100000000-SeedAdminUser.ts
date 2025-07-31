import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from 'bcrypt';

export class SeedAdminUser1754100000000 implements MigrationInterface {
    name = 'SeedAdminUser1754100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create a default admin user with password 'admin123!'
        const hashedPassword = await bcrypt.hash('admin123!', 10);
        
        // Insert admin user
        const userResult = await queryRunner.query(`
            INSERT INTO "user" (email, name, password, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
            RETURNING id
        `, ['admin@lumify.ai', 'Admin User', hashedPassword, true]);

        if (userResult && userResult.length > 0) {
            // Get ADMIN role
            const roleResult = await queryRunner.query(`
                SELECT id FROM "roles" WHERE name = 'ADMIN'
            `);

            if (roleResult && roleResult.length > 0) {
                // Link user to ADMIN role
                await queryRunner.query(`
                    INSERT INTO "user_roles_roles" ("userId", "rolesId")
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                `, [userResult[0].id, roleResult[0].id]);
            }
        }

        // Also create a regular user
        const userHashedPassword = await bcrypt.hash('user123!', 10);
        const userResult2 = await queryRunner.query(`
            INSERT INTO "user" (email, name, password, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
            RETURNING id
        `, ['user@lumify.ai', 'User', userHashedPassword, true]);

        if (userResult2 && userResult2.length > 0) {
            // Get USER role
            const roleResult = await queryRunner.query(`
                SELECT id FROM "roles" WHERE name = 'USER'
            `);

            if (roleResult && roleResult.length > 0) {
                // Link user to USER role
                await queryRunner.query(`
                    INSERT INTO "user_roles_roles" ("userId", "rolesId")
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                `, [userResult2[0].id, roleResult[0].id]);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "user" WHERE email IN ($1, $2)
        `, ['admin@lumify.ai', 'user@lumify.ai']);
    }
}