import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1750000000000 implements MigrationInterface {
  name = 'InitialSchema1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create organizations table
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying NOT NULL,
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);

    // Create teams table
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying NOT NULL,
        "organizationId" uuid,
        CONSTRAINT "PK_teams" PRIMARY KEY ("id"),
        CONSTRAINT "FK_teams_organizations" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create permissions table
    await queryRunner.query(`
      CREATE TYPE "permissions_action_enum" AS ENUM('MANAGE', 'CREATE', 'READ', 'UPDATE', 'DELETE')
    `);
    await queryRunner.query(`
      CREATE TYPE "permissions_subject_enum" AS ENUM('User', 'Organization', 'Event', 'Company', 'Person', 'OutreachSequence', 'Conversation', 'Meeting')
    `);
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "action" "permissions_action_enum" NOT NULL DEFAULT 'READ',
        "subject" "permissions_subject_enum" NOT NULL,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      )
    `);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying NOT NULL,
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);

    // Create roles_permissions_permissions junction table
    await queryRunner.query(`
      CREATE TABLE "roles_permissions_permissions" (
        "rolesId" uuid NOT NULL,
        "permissionsId" uuid NOT NULL,
        CONSTRAINT "PK_roles_permissions_permissions" PRIMARY KEY ("rolesId", "permissionsId"),
        CONSTRAINT "FK_roles_permissions_permissions_roles" FOREIGN KEY ("rolesId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_roles_permissions_permissions_permissions" FOREIGN KEY ("permissionsId") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_roles_permissions_permissions_roles" ON "roles_permissions_permissions" ("rolesId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_roles_permissions_permissions_permissions" ON "roles_permissions_permissions" ("permissionsId")
    `);

    // Create user table (without password and refreshToken - added by later migration)
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" SERIAL NOT NULL,
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "organizationId" uuid,
        "teamId" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_organizations" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_teams" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // Create user_roles_roles junction table
    await queryRunner.query(`
      CREATE TABLE "user_roles_roles" (
        "userId" integer NOT NULL,
        "rolesId" uuid NOT NULL,
        CONSTRAINT "PK_user_roles_roles" PRIMARY KEY ("userId", "rolesId"),
        CONSTRAINT "FK_user_roles_roles_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_user_roles_roles_roles" FOREIGN KEY ("rolesId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_roles_user" ON "user_roles_roles" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_roles_roles" ON "user_roles_roles" ("rolesId")
    `);

    // Create cities table
    await queryRunner.query(`
      CREATE TABLE "cities" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "country_code" character varying(2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_cities_name_country" UNIQUE ("name", "country_code"),
        CONSTRAINT "PK_cities" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cities_name" ON "cities" ("name")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cities_country_code" ON "cities" ("country_code")
    `);

    // Create venues table
    await queryRunner.query(`
      CREATE TABLE "venues" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "address" character varying,
        "cityId" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venues" PRIMARY KEY ("id"),
        CONSTRAINT "FK_venues_cities" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create companies table
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "domain" character varying,
        "website" character varying,
        "description" text,
        "industry" character varying,
        "size_range" character varying,
        "founded_year" integer,
        "linkedin_url" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_companies_domain" UNIQUE ("domain"),
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_companies_name" ON "companies" ("name")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_companies_domain" ON "companies" ("domain")
    `);

    // Create events table
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "start_dt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_dt" TIMESTAMP WITH TIME ZONE,
        "website_url" character varying,
        "status" character varying NOT NULL DEFAULT 'planned',
        "venueId" integer,
        "cityId" integer,
        "created_from_candidateId" integer,
        "created_from_job_id" integer,
        "organizationId" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_venues" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_events_cities" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_events_organizations" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create persons table
    await queryRunner.query(`
      CREATE TABLE "persons" (
        "id" SERIAL NOT NULL,
        "first_name" character varying NOT NULL,
        "last_name" character varying NOT NULL,
        "email" character varying,
        "phone" character varying,
        "linkedin_url" character varying,
        "title" character varying,
        "seniority" character varying,
        "companyId" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_persons_email" UNIQUE ("email"),
        CONSTRAINT "PK_persons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persons_companies" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_persons_email" ON "persons" ("email")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_persons_companyId" ON "persons" ("companyId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP INDEX "IDX_persons_companyId"`);
    await queryRunner.query(`DROP INDEX "IDX_persons_email"`);
    await queryRunner.query(`DROP TABLE "persons"`);

    await queryRunner.query(`DROP TABLE "events"`);

    await queryRunner.query(`DROP INDEX "IDX_companies_domain"`);
    await queryRunner.query(`DROP INDEX "IDX_companies_name"`);
    await queryRunner.query(`DROP TABLE "companies"`);

    await queryRunner.query(`DROP TABLE "venues"`);

    await queryRunner.query(`DROP INDEX "IDX_cities_country_code"`);
    await queryRunner.query(`DROP INDEX "IDX_cities_name"`);
    await queryRunner.query(`DROP TABLE "cities"`);

    await queryRunner.query(`DROP INDEX "IDX_user_roles_roles_roles"`);
    await queryRunner.query(`DROP INDEX "IDX_user_roles_roles_user"`);
    await queryRunner.query(`DROP TABLE "user_roles_roles"`);

    await queryRunner.query(`DROP TABLE "user"`);

    await queryRunner.query(
      `DROP INDEX "IDX_roles_permissions_permissions_permissions"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_roles_permissions_permissions_roles"`,
    );
    await queryRunner.query(`DROP TABLE "roles_permissions_permissions"`);

    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TYPE "permissions_subject_enum"`);
    await queryRunner.query(`DROP TYPE "permissions_action_enum"`);

    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
  }
}
