import { MigrationInterface, QueryRunner } from 'typeorm';

export class AISystemTables1732025000002 implements MigrationInterface {
  name = 'AISystemTables1732025000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ai_prompts table
    await queryRunner.query(`
      CREATE TABLE "ai_prompts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "promptId" character varying(100) NOT NULL,
        "name" character varying(255) NOT NULL,
        "systemPrompt" text NOT NULL,
        "userPromptTemplate" text,
        "version" character varying(20) NOT NULL,
        "modelPreference" character varying(50) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ai_prompts_promptId" UNIQUE ("promptId"),
        CONSTRAINT "PK_ai_prompts_id" PRIMARY KEY ("id")
      )
    `);

    // Create ai_sessions table
    await queryRunner.query(`
      CREATE TABLE "ai_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "sessionType" character varying(100) NOT NULL,
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "endedAt" TIMESTAMP,
        "metadata" jsonb,
        CONSTRAINT "UQ_ai_sessions_agentId" UNIQUE ("agentId"),
        CONSTRAINT "PK_ai_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create ai_interactions table
    await queryRunner.query(`
      CREATE TABLE "ai_interactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "promptId" uuid NOT NULL,
        "userInput" text NOT NULL,
        "aiResponse" text NOT NULL,
        "modelUsed" character varying(100) NOT NULL,
        "tokensUsed" integer,
        "responseTimeMs" integer,
        "success" boolean NOT NULL DEFAULT true,
        "errorMessage" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_interactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_interactions_session" FOREIGN KEY ("sessionId") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_ai_interactions_prompt" FOREIGN KEY ("promptId") REFERENCES "ai_prompts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create ai_finetune_datasets table
    await queryRunner.query(`
      CREATE TABLE "ai_finetune_datasets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "interactionId" uuid NOT NULL,
        "qualityScore" integer,
        "humanFeedback" text,
        "includedInTraining" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ai_finetune_datasets_interactionId" UNIQUE ("interactionId"),
        CONSTRAINT "CHK_ai_finetune_datasets_quality_score" CHECK ("qualityScore" >= 1 AND "qualityScore" <= 5),
        CONSTRAINT "PK_ai_finetune_datasets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_finetune_datasets_interaction" FOREIGN KEY ("interactionId") REFERENCES "ai_interactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create basic indexes for AI tables
    await queryRunner.query(`CREATE INDEX "IDX_ai_prompts_promptId" ON "ai_prompts" ("promptId")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_sessions_agentId" ON "ai_sessions" ("agentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_sessions_userId" ON "ai_sessions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_interactions_sessionId" ON "ai_interactions" ("sessionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_interactions_promptId" ON "ai_interactions" ("promptId")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_finetune_datasets_interactionId" ON "ai_finetune_datasets" ("interactionId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_finetune_datasets_interactionId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_interactions_promptId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_interactions_sessionId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sessions_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sessions_agentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_prompts_promptId"`);

    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_finetune_datasets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_interactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_prompts"`);
  }
}
