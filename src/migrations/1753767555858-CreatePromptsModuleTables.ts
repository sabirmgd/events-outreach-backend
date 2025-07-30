import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromptsModuleTables1753767555858
  implements MigrationInterface
{
  name = 'CreatePromptsModuleTables1753767555858';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tag" ("id" SERIAL NOT NULL, "type" character varying NOT NULL, "value" character varying NOT NULL, "normalized_value" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dbd016fb9b2953fe42f0501197c" UNIQUE ("type"), CONSTRAINT "PK_8e4052373c579afc1471f526760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prompt_evaluations_status_enum" AS ENUM('pending', 'running', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "prompt_evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "promptId" uuid NOT NULL, "versionId" uuid NOT NULL, "status" "public"."prompt_evaluations_status_enum" NOT NULL DEFAULT 'pending', "input" jsonb NOT NULL, "output" jsonb, "variables" jsonb, "executionTime" integer, "tokenCount" integer, "cost" double precision, "qualityScore" double precision, "error" character varying, "metadata" jsonb, "agentId" character varying, "agentMethodName" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4b0d55fad99a721fc57fbb0c9bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e5c63bb56991a50a22fb07ee6f" ON "prompt_evaluations" ("promptId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8712ce0f9c25350af6828e3e25" ON "prompt_evaluations" ("versionId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prompt_versions_status_enum" AS ENUM('draft', 'published', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "prompt_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "promptId" uuid NOT NULL, "version" integer NOT NULL, "body" text NOT NULL, "status" "public"."prompt_versions_status_enum" NOT NULL DEFAULT 'draft', "publishedAt" TIMESTAMP, "publishedBy" character varying, "changelog" character varying, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5411972c2e9c63bd40530b80545" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0efad0ae38e541ac78c97a185" ON "prompt_versions" ("promptId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d320d734c1675c952cd65c3891" ON "prompt_versions" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4f1a1170ad61714f8d0c3ceaa5" ON "prompt_versions" ("promptId", "version") `,
    );
    await queryRunner.query(
      `CREATE TABLE "prompt_tags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "color" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fc7783a4692f45c6e37f0a43faa" UNIQUE ("name"), CONSTRAINT "PK_21cb077f35a2550833f10b35d22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc7783a4692f45c6e37f0a43fa" ON "prompt_tags" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "prompt_test_cases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "promptId" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying, "input" jsonb NOT NULL, "expectedOutput" jsonb NOT NULL, "variables" jsonb, "isActive" boolean NOT NULL DEFAULT true, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7c91cf46229f7253c49b51f115a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_789c6eab327ed94086cd513f6e" ON "prompt_test_cases" ("promptId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prompts_type_enum" AS ENUM('system', 'user', 'assistant', 'function')`,
    );
    await queryRunner.query(
      `CREATE TABLE "prompts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "namespace" character varying NOT NULL, "type" "public"."prompts_type_enum" NOT NULL DEFAULT 'system', "variables" jsonb, "isArchived" boolean NOT NULL DEFAULT false, "agentId" character varying, "agentMethodName" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5f1c030402ad99555ef6d5e8ab3" UNIQUE ("key"), CONSTRAINT "PK_21f33798862975179e40b216a1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f1c030402ad99555ef6d5e8ab" ON "prompts" ("key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7be20e05b6a67180e05ea2f165" ON "prompts" ("namespace") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "name" character varying NOT NULL, "role" character varying, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "person" ("id" SERIAL NOT NULL, "full_name" character varying NOT NULL, "first_name" character varying, "last_name" character varying, "linkedin_url" character varying, "seniority" character varying, "current_title" character varying, "location_text" character varying, "source_confidence" double precision, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "last_updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c417925a3e3dd0e3be35a724582" UNIQUE ("linkedin_url"), CONSTRAINT "PK_5fdaf670315c4b7e70cce85daa3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "city" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "country_code" character varying NOT NULL, "region" character varying, "lat" double precision, "lon" double precision, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f8c0858628830a35f19efdc0ecf" UNIQUE ("name"), CONSTRAINT "PK_b222f51ce26f7e5ca86944a6739" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "legal_name" character varying, "website" character varying, "linkedin_url" character varying, "crunchbase_url" character varying, "employee_range" character varying, "revenue_range" character varying, "primary_industry" character varying, "description" text, "document_with_weights" tsvector, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "hqCityId" integer, CONSTRAINT "UQ_a76c5cd486f7779bd9c319afd27" UNIQUE ("name"), CONSTRAINT "UQ_96c8a2ca6771f4e66d01e5270eb" UNIQUE ("website"), CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3b9e8a4372556c45425d9414c" ON "company" ("document_with_weights") `,
    );
    await queryRunner.query(
      `CREATE TABLE "company_person_role" ("id" SERIAL NOT NULL, "role_title" character varying, "role_category" character varying, "is_decision_maker" boolean NOT NULL DEFAULT false, "start_date" TIMESTAMP, "end_date" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "companyId" integer, "personId" integer, CONSTRAINT "PK_911e9fcdde746375854fe46d12b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contact_channel" ("id" SERIAL NOT NULL, "type" character varying NOT NULL, "value" character varying NOT NULL, "validation_status" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "last_verified_at" TIMESTAMP NOT NULL DEFAULT now(), "personId" integer, CONSTRAINT "PK_1cf704d3639d8c0bc397c3679dc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "venue" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "address" character varying, "lat" double precision, "lon" double precision, "normalized_name" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "cityId" integer, CONSTRAINT "PK_c53deb6d1bcb088f9d459e7dbc0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "event_candidates" ("id" SERIAL NOT NULL, "source_id" integer, "raw_title" character varying NOT NULL, "raw_start_dt" character varying, "raw_end_dt" character varying, "raw_html" text, "url" character varying, "status" character varying NOT NULL DEFAULT 'scraped', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8f9c3eb3254d28c8c63253deb9d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_type_enum" AS ENUM('DISCOVER_EVENTS', 'SCRAPE_SPONSORS', 'ENRICH_COMPANY', 'DISCOVER_PERSONAS')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_status_enum" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."jobs_type_enum" NOT NULL, "status" "public"."jobs_status_enum" NOT NULL DEFAULT 'PENDING', "inputParameters" jsonb NOT NULL, "executionPrompt" text NOT NULL, "rawOutput" text, "structuredOutput" jsonb, "error" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id")); COMMENT ON COLUMN "jobs"."inputParameters" IS 'The initial parameters used to trigger the job, e.g., { "cities": ["SF"] }'; COMMENT ON COLUMN "jobs"."executionPrompt" IS 'The full, final prompt sent to the external tool'; COMMENT ON COLUMN "jobs"."rawOutput" IS 'The raw, unmodified output from the external tool'; COMMENT ON COLUMN "jobs"."structuredOutput" IS 'The structured, validated output after post-processing'; COMMENT ON COLUMN "jobs"."error" IS 'Logs any errors that occurred during the job execution'`,
    );
    await queryRunner.query(
      `CREATE TABLE "event_source" ("id" SERIAL NOT NULL, "provider" character varying NOT NULL, "provider_event_uid" character varying, "confidence_score" double precision, "payload_json" jsonb, "fetched_at" TIMESTAMP NOT NULL DEFAULT now(), "eventId" integer, CONSTRAINT "PK_3ac063c4d7882981e9843b067d3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "event_sponsor" ("id" SERIAL NOT NULL, "sponsor_tier" character varying, "is_past_sponsor" boolean NOT NULL DEFAULT false, "first_observed_at" TIMESTAMP NOT NULL DEFAULT now(), "last_observed_at" TIMESTAMP NOT NULL DEFAULT now(), "eventId" integer, "companyId" integer, "sourceId" integer, CONSTRAINT "PK_8581880a39906a24a0a877d2983" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "events" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "start_dt" TIMESTAMP WITH TIME ZONE NOT NULL, "end_dt" TIMESTAMP WITH TIME ZONE, "website_url" character varying, "status" character varying NOT NULL DEFAULT 'planned', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "venueId" integer, "cityId" integer, "createdFromCandidateId" integer, "created_from_job_id" uuid, CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "outreach_sequence" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "objective" character varying, "company_filter_json" jsonb, "persona_filter_json" jsonb, "status" character varying NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "eventId" integer, CONSTRAINT "PK_f4a091ee759abf3e06c3ead6405" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "outreach_step_template" ("id" SERIAL NOT NULL, "step_number" integer NOT NULL, "channel" character varying NOT NULL, "day_offset" integer NOT NULL, "subject_template" text, "body_template" text, "max_retries" integer NOT NULL DEFAULT '1', "sequenceId" integer, CONSTRAINT "PK_08d1be738492e7fb844ffd66301" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting" ("id" SERIAL NOT NULL, "scheduled_start_dt" TIMESTAMP NOT NULL, "scheduled_end_dt" TIMESTAMP, "booking_source" character varying, "status" character varying NOT NULL DEFAULT 'scheduled', "meeting_url" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "eventId" integer, "companyId" integer, CONSTRAINT "PK_dccaf9e4c0e39067d82ccc7bb83" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "outreach_message_instance" ("id" SERIAL NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "scheduled_at" TIMESTAMP, "sent_at" TIMESTAMP, "replied_at" TIMESTAMP, "subject_rendered" text, "body_rendered" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "personId" integer, "companyId" integer, "sequenceId" integer, "stepTemplateId" integer, "eventId" integer, CONSTRAINT "PK_d481bd64790b7634ab16168199f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting_source" ("id" SERIAL NOT NULL, "source_payload_json" jsonb, "received_at" TIMESTAMP NOT NULL DEFAULT now(), "meetingId" integer, CONSTRAINT "PK_dfb86b8861edb92079637a3a587" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting_attendee" ("id" SERIAL NOT NULL, "role" character varying, "attendance_status" character varying, "meetingId" integer, "personId" integer, "internalUserId" integer, CONSTRAINT "PK_503e099c618ff1a7ac117352ca7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "scrape_job" ("id" SERIAL NOT NULL, "job_type" character varying NOT NULL, "target_url" character varying, "adapter" character varying, "started_at" TIMESTAMP, "finished_at" TIMESTAMP, "status" character varying, "error_msg" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a1ad8d7b3bd3aeb0a4921021ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "enrichment_job" ("id" SERIAL NOT NULL, "job_type" character varying NOT NULL, "started_at" TIMESTAMP, "finished_at" TIMESTAMP, "status" character varying, "meta_json" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_96b6468ea7683e96c246f6a1d0d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_artifact" ("id" SERIAL NOT NULL, "artifact_type" character varying NOT NULL, "storage_path" character varying NOT NULL, "size_bytes" integer, "sha256" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "scrapeJobId" integer, CONSTRAINT "PK_779410ff8593752617851db50ed" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_tag" ("id" SERIAL NOT NULL, "companyId" integer, "tagId" integer, CONSTRAINT "PK_f2b9939fa29a204ec370a10d2df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_source" ("id" SERIAL NOT NULL, "provider" character varying NOT NULL, "payload_json" jsonb, "fetched_at" TIMESTAMP NOT NULL DEFAULT now(), "companyId" integer, CONSTRAINT "PK_7f52d5c0c276ffe08108af9732f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_similarity" ("id" SERIAL NOT NULL, "similarity_score" double precision NOT NULL, "method" character varying NOT NULL, "companyId" integer, "similarCompanyId" integer, CONSTRAINT "PK_2e48e109d0b9c6dee73658d2d58" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "prompt_tags_mapping" ("prompt_id" uuid NOT NULL, "tag_id" uuid NOT NULL, CONSTRAINT "PK_53a8599cba94e20f729d0ca3753" PRIMARY KEY ("prompt_id", "tag_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5e5244764b97be631fb5a5105e" ON "prompt_tags_mapping" ("prompt_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19e2bd4f1b604afe79556c35ef" ON "prompt_tags_mapping" ("tag_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_evaluations" ADD CONSTRAINT "FK_e5c63bb56991a50a22fb07ee6ff" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_evaluations" ADD CONSTRAINT "FK_8712ce0f9c25350af6828e3e255" FOREIGN KEY ("versionId") REFERENCES "prompt_versions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_versions" ADD CONSTRAINT "FK_e0efad0ae38e541ac78c97a1853" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_test_cases" ADD CONSTRAINT "FK_789c6eab327ed94086cd513f6e3" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD CONSTRAINT "FK_801def70c4b9cde001ce2056ab8" FOREIGN KEY ("hqCityId") REFERENCES "city"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_person_role" ADD CONSTRAINT "FK_a761077dd9221cb1735f6bc448c" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_person_role" ADD CONSTRAINT "FK_df0c1434713a42f1e283a94358a" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_channel" ADD CONSTRAINT "FK_b838202dc7b3d6e828af0409b39" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue" ADD CONSTRAINT "FK_2543ff3be95a7757233715f77f1" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_source" ADD CONSTRAINT "FK_cce32834e06e3a69b0712e40f23" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sponsor" ADD CONSTRAINT "FK_04889938b0102227f0fa57387cb" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sponsor" ADD CONSTRAINT "FK_7e9f45f6dbaaafbfebd8844dd4d" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sponsor" ADD CONSTRAINT "FK_8b7095291204e82060c5054c6e3" FOREIGN KEY ("sourceId") REFERENCES "event_source"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_0af7bb0535bc01f3c130cfe5fe7" FOREIGN KEY ("venueId") REFERENCES "venue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_712790b5c3b1e6d859c0987c4f5" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_c672660ce97148439dd58f82e9d" FOREIGN KEY ("createdFromCandidateId") REFERENCES "event_candidates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "FK_3f8d62b4111ef8d3f778d64d9b3" FOREIGN KEY ("created_from_job_id") REFERENCES "jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_sequence" ADD CONSTRAINT "FK_936bedac030b8a458f07c63ec19" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_step_template" ADD CONSTRAINT "FK_280a33bef6842918f52bebb7466" FOREIGN KEY ("sequenceId") REFERENCES "outreach_sequence"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting" ADD CONSTRAINT "FK_7aa245268e5a7d1137d0fe446c4" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting" ADD CONSTRAINT "FK_7f5189ab96710497686462bff79" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" ADD CONSTRAINT "FK_1d2f5a0de8d8a2d3e28b3cdfa92" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" ADD CONSTRAINT "FK_2de0d143842a9060d0c0cec45c9" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" ADD CONSTRAINT "FK_4ed1afc4447e36744e716d29770" FOREIGN KEY ("sequenceId") REFERENCES "outreach_sequence"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" ADD CONSTRAINT "FK_3dea910316464186ffa8ff0d107" FOREIGN KEY ("stepTemplateId") REFERENCES "outreach_step_template"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" ADD CONSTRAINT "FK_242b2a37e30feb5a8c743213671" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_source" ADD CONSTRAINT "FK_e8fb9356883f8c9234ede3b31b3" FOREIGN KEY ("meetingId") REFERENCES "meeting"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendee" ADD CONSTRAINT "FK_627c1a17372cdaa4e13cb9bc68b" FOREIGN KEY ("meetingId") REFERENCES "meeting"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendee" ADD CONSTRAINT "FK_f5967458baeb3fe189e2cb37407" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendee" ADD CONSTRAINT "FK_25f56cb80fb73050aa12b4adc3e" FOREIGN KEY ("internalUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_artifact" ADD CONSTRAINT "FK_9b0dbeadfaffb1d4735dd753cd7" FOREIGN KEY ("scrapeJobId") REFERENCES "scrape_job"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_tag" ADD CONSTRAINT "FK_f4ac13520d8be2403d01897626c" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_tag" ADD CONSTRAINT "FK_dd29fa1e17ac254ee7ba729d0ca" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_source" ADD CONSTRAINT "FK_b539066fd38947ae7ffeccfdb5c" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_similarity" ADD CONSTRAINT "FK_72674dedda3dc3794517204b938" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_similarity" ADD CONSTRAINT "FK_dc1e3c6dc40e8454a184d456e16" FOREIGN KEY ("similarCompanyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_tags_mapping" ADD CONSTRAINT "FK_5e5244764b97be631fb5a5105e1" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_tags_mapping" ADD CONSTRAINT "FK_19e2bd4f1b604afe79556c35ef7" FOREIGN KEY ("tag_id") REFERENCES "prompt_tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "prompt_tags_mapping" DROP CONSTRAINT "FK_19e2bd4f1b604afe79556c35ef7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_tags_mapping" DROP CONSTRAINT "FK_5e5244764b97be631fb5a5105e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_similarity" DROP CONSTRAINT "FK_dc1e3c6dc40e8454a184d456e16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_similarity" DROP CONSTRAINT "FK_72674dedda3dc3794517204b938"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_source" DROP CONSTRAINT "FK_b539066fd38947ae7ffeccfdb5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_tag" DROP CONSTRAINT "FK_dd29fa1e17ac254ee7ba729d0ca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_tag" DROP CONSTRAINT "FK_f4ac13520d8be2403d01897626c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_artifact" DROP CONSTRAINT "FK_9b0dbeadfaffb1d4735dd753cd7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendee" DROP CONSTRAINT "FK_25f56cb80fb73050aa12b4adc3e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendee" DROP CONSTRAINT "FK_f5967458baeb3fe189e2cb37407"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_attendee" DROP CONSTRAINT "FK_627c1a17372cdaa4e13cb9bc68b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting_source" DROP CONSTRAINT "FK_e8fb9356883f8c9234ede3b31b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" DROP CONSTRAINT "FK_242b2a37e30feb5a8c743213671"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" DROP CONSTRAINT "FK_3dea910316464186ffa8ff0d107"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" DROP CONSTRAINT "FK_4ed1afc4447e36744e716d29770"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" DROP CONSTRAINT "FK_2de0d143842a9060d0c0cec45c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_message_instance" DROP CONSTRAINT "FK_1d2f5a0de8d8a2d3e28b3cdfa92"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting" DROP CONSTRAINT "FK_7f5189ab96710497686462bff79"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meeting" DROP CONSTRAINT "FK_7aa245268e5a7d1137d0fe446c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_step_template" DROP CONSTRAINT "FK_280a33bef6842918f52bebb7466"`,
    );
    await queryRunner.query(
      `ALTER TABLE "outreach_sequence" DROP CONSTRAINT "FK_936bedac030b8a458f07c63ec19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_3f8d62b4111ef8d3f778d64d9b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_c672660ce97148439dd58f82e9d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_712790b5c3b1e6d859c0987c4f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "FK_0af7bb0535bc01f3c130cfe5fe7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sponsor" DROP CONSTRAINT "FK_8b7095291204e82060c5054c6e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sponsor" DROP CONSTRAINT "FK_7e9f45f6dbaaafbfebd8844dd4d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sponsor" DROP CONSTRAINT "FK_04889938b0102227f0fa57387cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_source" DROP CONSTRAINT "FK_cce32834e06e3a69b0712e40f23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "venue" DROP CONSTRAINT "FK_2543ff3be95a7757233715f77f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact_channel" DROP CONSTRAINT "FK_b838202dc7b3d6e828af0409b39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_person_role" DROP CONSTRAINT "FK_df0c1434713a42f1e283a94358a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_person_role" DROP CONSTRAINT "FK_a761077dd9221cb1735f6bc448c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" DROP CONSTRAINT "FK_801def70c4b9cde001ce2056ab8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_test_cases" DROP CONSTRAINT "FK_789c6eab327ed94086cd513f6e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_versions" DROP CONSTRAINT "FK_e0efad0ae38e541ac78c97a1853"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_evaluations" DROP CONSTRAINT "FK_8712ce0f9c25350af6828e3e255"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prompt_evaluations" DROP CONSTRAINT "FK_e5c63bb56991a50a22fb07ee6ff"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19e2bd4f1b604afe79556c35ef"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5e5244764b97be631fb5a5105e"`,
    );
    await queryRunner.query(`DROP TABLE "prompt_tags_mapping"`);
    await queryRunner.query(`DROP TABLE "company_similarity"`);
    await queryRunner.query(`DROP TABLE "company_source"`);
    await queryRunner.query(`DROP TABLE "company_tag"`);
    await queryRunner.query(`DROP TABLE "job_artifact"`);
    await queryRunner.query(`DROP TABLE "enrichment_job"`);
    await queryRunner.query(`DROP TABLE "scrape_job"`);
    await queryRunner.query(`DROP TABLE "meeting_attendee"`);
    await queryRunner.query(`DROP TABLE "meeting_source"`);
    await queryRunner.query(`DROP TABLE "outreach_message_instance"`);
    await queryRunner.query(`DROP TABLE "meeting"`);
    await queryRunner.query(`DROP TABLE "outreach_step_template"`);
    await queryRunner.query(`DROP TABLE "outreach_sequence"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TABLE "event_sponsor"`);
    await queryRunner.query(`DROP TABLE "event_source"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_type_enum"`);
    await queryRunner.query(`DROP TABLE "event_candidates"`);
    await queryRunner.query(`DROP TABLE "venue"`);
    await queryRunner.query(`DROP TABLE "contact_channel"`);
    await queryRunner.query(`DROP TABLE "company_person_role"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f3b9e8a4372556c45425d9414c"`,
    );
    await queryRunner.query(`DROP TABLE "company"`);
    await queryRunner.query(`DROP TABLE "city"`);
    await queryRunner.query(`DROP TABLE "person"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7be20e05b6a67180e05ea2f165"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5f1c030402ad99555ef6d5e8ab"`,
    );
    await queryRunner.query(`DROP TABLE "prompts"`);
    await queryRunner.query(`DROP TYPE "public"."prompts_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_789c6eab327ed94086cd513f6e"`,
    );
    await queryRunner.query(`DROP TABLE "prompt_test_cases"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fc7783a4692f45c6e37f0a43fa"`,
    );
    await queryRunner.query(`DROP TABLE "prompt_tags"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4f1a1170ad61714f8d0c3ceaa5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d320d734c1675c952cd65c3891"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0efad0ae38e541ac78c97a185"`,
    );
    await queryRunner.query(`DROP TABLE "prompt_versions"`);
    await queryRunner.query(`DROP TYPE "public"."prompt_versions_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8712ce0f9c25350af6828e3e25"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e5c63bb56991a50a22fb07ee6f"`,
    );
    await queryRunner.query(`DROP TABLE "prompt_evaluations"`);
    await queryRunner.query(
      `DROP TYPE "public"."prompt_evaluations_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "tag"`);
  }
}
