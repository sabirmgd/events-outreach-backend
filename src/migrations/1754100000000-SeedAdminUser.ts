import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from 'bcrypt';

export class SeedAdminUser1754100000000 implements MigrationInterface {
    name = 'SeedAdminUser1754100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create a default admin user with password 'admin123!'
        const hashedPassword = await bcrypt.hash('admin123!', 10);
        
        await queryRunner.query(`
            INSERT INTO "user" (email, name, password, role, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
        `, ['admin@lumify.ai', 'Admin User', hashedPassword, 'admin', true]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "user" WHERE email = $1
        `, ['admin@lumify.ai']);
    }
}