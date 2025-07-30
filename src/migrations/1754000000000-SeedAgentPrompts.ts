import { MigrationInterface, QueryRunner } from 'typeorm';
import { agentPrompts } from '../prompts/data/agent-prompts.seed';

export class SeedAgentPrompts1754000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert prompts
    for (const promptData of agentPrompts) {
      const promptId = await queryRunner.query(
        `INSERT INTO prompts ("key", "name", "description", "namespace", "type", "variables", "isArchived") 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [
          promptData.key,
          promptData.name,
          promptData.description,
          promptData.agentNamespace,
          promptData.promptType,
          JSON.stringify(promptData.variables || []),
          false
        ]
      );

      // Create initial version
      await queryRunner.query(
        `INSERT INTO prompt_versions ("promptId", "version", "body", "status", "changelog") 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          promptId[0].id,
          1,
          promptData.body,
          'published',
          'Initial version'
        ]
      );

      // Add tags
      if (promptData.tags && promptData.tags.length > 0) {
        for (const tag of promptData.tags) {
          // First insert or get existing tag
          const tagResult = await queryRunner.query(
            `INSERT INTO prompt_tags ("name") VALUES ($1)
             ON CONFLICT ("name") DO UPDATE SET "name" = EXCLUDED."name"
             RETURNING id`,
            [tag]
          );
          
          // Then create the mapping
          await queryRunner.query(
            `INSERT INTO prompt_tags_mapping ("prompt_id", "tag_id") VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [promptId[0].id, tagResult[0].id]
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded prompts
    for (const promptData of agentPrompts) {
      await queryRunner.query(`DELETE FROM prompts WHERE "key" = $1`, [promptData.key]);
    }
  }
}