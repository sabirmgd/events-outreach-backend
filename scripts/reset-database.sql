-- Reset database script
-- WARNING: This will drop all tables and data!

-- Drop all tables in the correct order to avoid foreign key constraints
DROP TABLE IF EXISTS "event_sponsors" CASCADE;
DROP TABLE IF EXISTS "event_candidates_promoted_to_events_events" CASCADE;
DROP TABLE IF EXISTS "event_candidates" CASCADE;
DROP TABLE IF EXISTS "event_sources" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "company_person_roles" CASCADE;
DROP TABLE IF EXISTS "contact_channels" CASCADE;
DROP TABLE IF EXISTS "persons" CASCADE;
DROP TABLE IF EXISTS "companies" CASCADE;
DROP TABLE IF EXISTS "venues" CASCADE;
DROP TABLE IF EXISTS "cities" CASCADE;
DROP TABLE IF EXISTS "jobs" CASCADE;
DROP TABLE IF EXISTS "outreach_sequences" CASCADE;
DROP TABLE IF EXISTS "conversations" CASCADE;
DROP TABLE IF EXISTS "meetings" CASCADE;
DROP TABLE IF EXISTS "tags" CASCADE;
DROP TABLE IF EXISTS "prompt_tags_mapping" CASCADE;
DROP TABLE IF EXISTS "prompt_tags" CASCADE;
DROP TABLE IF EXISTS "prompt_evaluations" CASCADE;
DROP TABLE IF EXISTS "prompt_evaluation_scores" CASCADE;
DROP TABLE IF EXISTS "prompt_versions" CASCADE;
DROP TABLE IF EXISTS "prompts" CASCADE;
DROP TABLE IF EXISTS "user_roles_roles" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS "teams" CASCADE;
DROP TABLE IF EXISTS "roles_permissions_permissions" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;
DROP TABLE IF EXISTS "permissions" CASCADE;
DROP TABLE IF EXISTS "organizations" CASCADE;
DROP TABLE IF EXISTS "migrations" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "permissions_action_enum" CASCADE;
DROP TYPE IF EXISTS "permissions_subject_enum" CASCADE;
DROP TYPE IF EXISTS "prompt_type_enum" CASCADE;
DROP TYPE IF EXISTS "prompt_version_status_enum" CASCADE;

-- Reset sequences
DROP SEQUENCE IF EXISTS user_id_seq CASCADE;
DROP SEQUENCE IF EXISTS cities_id_seq CASCADE;
DROP SEQUENCE IF EXISTS venues_id_seq CASCADE;
DROP SEQUENCE IF EXISTS companies_id_seq CASCADE;
DROP SEQUENCE IF EXISTS events_id_seq CASCADE;
DROP SEQUENCE IF EXISTS persons_id_seq CASCADE;