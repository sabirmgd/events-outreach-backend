import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordAndRefreshTokenToUser1753909126511
  implements MigrationInterface
{
  name = 'AddPasswordAndRefreshTokenToUser1753909126511';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "refreshToken" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "refreshToken"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`);
  }
}
