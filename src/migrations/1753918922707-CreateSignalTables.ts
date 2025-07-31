import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSignalTables1753918922707 implements MigrationInterface {
  name = 'CreateSignalTables1753918922707';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create signal type enum
    await queryRunner.query(
      `CREATE TYPE "public"."signals_type_enum" AS ENUM('conference', 'funding', 'hiring', 'product_launch', 'acquisition')`,
    );

    // Create signal status enum
    await queryRunner.query(
      `CREATE TYPE "public"."signals_status_enum" AS ENUM('active', 'paused', 'archived')`,
    );

    // Create signal frequency enum
    await queryRunner.query(
      `CREATE TYPE "public"."signals_frequency_enum" AS ENUM('on-demand', 'daily', 'weekly', 'monthly')`,
    );

    // Create signals table
    await queryRunner.query(
      `CREATE TABLE "signals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "type" "public"."signals_type_enum" NOT NULL,
        "status" "public"."signals_status_enum" NOT NULL DEFAULT 'active',
        "configuration" jsonb NOT NULL,
        "schedule" jsonb,
        "stats" jsonb,
        "created_by" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_b24a93c3e0de0e4e3e0c28a48f5" PRIMARY KEY ("id")
      )`,
    );

    // Create indexes for signals
    await queryRunner.query(
      `CREATE INDEX "IDX_signals_type" ON "signals" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_signals_status" ON "signals" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_signals_created_by" ON "signals" ("created_by")`,
    );

    // Create execution status enum
    await queryRunner.query(
      `CREATE TYPE "public"."signal_executions_status_enum" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled')`,
    );

    // Create signal_executions table
    await queryRunner.query(
      `CREATE TABLE "signal_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "signal_id" uuid NOT NULL,
        "status" "public"."signal_executions_status_enum" NOT NULL DEFAULT 'pending',
        "parameters" jsonb,
        "results" jsonb,
        "error" jsonb,
        "duration" integer NOT NULL DEFAULT '0',
        "executed_by" integer NOT NULL,
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP,
        CONSTRAINT "PK_9d5e5c5e5c5e5c5e5c5e5c5e5c5" PRIMARY KEY ("id")
      )`,
    );

    // Create indexes for signal_executions
    await queryRunner.query(
      `CREATE INDEX "IDX_signal_executions_signal_id" ON "signal_executions" ("signal_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_signal_executions_status" ON "signal_executions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_signal_executions_executed_by" ON "signal_executions" ("executed_by")`,
    );

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "signals" ADD CONSTRAINT "FK_signals_created_by" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    
    await queryRunner.query(
      `ALTER TABLE "signal_executions" ADD CONSTRAINT "FK_signal_executions_signal_id" FOREIGN KEY ("signal_id") REFERENCES "signals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    
    await queryRunner.query(
      `ALTER TABLE "signal_executions" ADD CONSTRAINT "FK_signal_executions_executed_by" FOREIGN KEY ("executed_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "signal_executions" DROP CONSTRAINT "FK_signal_executions_executed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signal_executions" DROP CONSTRAINT "FK_signal_executions_signal_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signals" DROP CONSTRAINT "FK_signals_created_by"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_signal_executions_executed_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_signal_executions_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_signal_executions_signal_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_signals_created_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_signals_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_signals_type"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "signal_executions"`);
    await queryRunner.query(`DROP TABLE "signals"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."signal_executions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."signals_frequency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."signals_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."signals_type_enum"`);
  }
}