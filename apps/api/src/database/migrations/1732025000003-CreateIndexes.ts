import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexes1732025000003 implements MigrationInterface {
  name = 'CreateIndexes1732025000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Performance indexes for users table
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_kycStatus" ON "users" ("kycStatus")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_emailVerified" ON "users" ("emailVerified")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_createdAt" ON "users" ("createdAt")`);

    // Performance indexes for references table
    await queryRunner.query(`CREATE INDEX "IDX_references_status" ON "references" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_references_format" ON "references" ("format")`);
    await queryRunner.query(`CREATE INDEX "IDX_references_createdAt" ON "references" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_references_expiryDate" ON "references" ("expiryDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_references_rcsScore" ON "references" ("rcsScore")`);

    // Composite indexes for common queries
    await queryRunner.query(
      `CREATE INDEX "IDX_references_seeker_status" ON "references" ("seekerId", "status")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_references_referrer_status" ON "references" ("referrerId", "status")`
    );

    // Performance indexes for bundles table
    await queryRunner.query(`CREATE INDEX "IDX_bundles_isActive" ON "bundles" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_bundles_createdAt" ON "bundles" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_bundles_expiryDate" ON "bundles" ("expiryDate")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_bundles_seeker_active" ON "bundles" ("seekerId", "isActive")`
    );

    // Performance indexes for kyc_documents table
    await queryRunner.query(`CREATE INDEX "IDX_kyc_documents_status" ON "kyc_documents" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_kyc_documents_documentType" ON "kyc_documents" ("documentType")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_documents_user_status" ON "kyc_documents" ("userId", "status")`
    );

    // Performance indexes for ai_prompts table
    await queryRunner.query(`CREATE INDEX "IDX_ai_prompts_isActive" ON "ai_prompts" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_prompts_modelPreference" ON "ai_prompts" ("modelPreference")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_prompts_active_model" ON "ai_prompts" ("isActive", "modelPreference")`
    );

    // Performance indexes for ai_sessions table
    await queryRunner.query(`CREATE INDEX "IDX_ai_sessions_sessionType" ON "ai_sessions" ("sessionType")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_sessions_startedAt" ON "ai_sessions" ("startedAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_sessions_endedAt" ON "ai_sessions" ("endedAt")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_sessions_user_type" ON "ai_sessions" ("userId", "sessionType")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_sessions_active" ON "ai_sessions" ("userId", "startedAt") WHERE "endedAt" IS NULL`
    );

    // Performance indexes for ai_interactions table
    await queryRunner.query(`CREATE INDEX "IDX_ai_interactions_createdAt" ON "ai_interactions" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_interactions_success" ON "ai_interactions" ("success")`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_interactions_modelUsed" ON "ai_interactions" ("modelUsed")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_interactions_session_created" ON "ai_interactions" ("sessionId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_interactions_prompt_created" ON "ai_interactions" ("promptId", "createdAt")`
    );

    // Performance indexes for ai_finetune_datasets table
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_finetune_datasets_includedInTraining" ON "ai_finetune_datasets" ("includedInTraining")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_finetune_datasets_qualityScore" ON "ai_finetune_datasets" ("qualityScore")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_finetune_datasets_quality_included" ON "ai_finetune_datasets" ("qualityScore", "includedInTraining")`
    );

    // Full-text search indexes (for PostgreSQL)
    await queryRunner.query(`
      CREATE INDEX "IDX_references_fulltext" ON "references"
      USING gin(to_tsvector('english',
        coalesce("referrerName", '') || ' ' ||
        coalesce("company", '') || ' ' ||
        coalesce("role", '')
      ))
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundles_fulltext" ON "bundles"
      USING gin(to_tsvector('english',
        coalesce("title", '') || ' ' ||
        coalesce("description", '')
      ))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop full-text search indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundles_fulltext"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_fulltext"`);

    // Drop ai_finetune_datasets indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_finetune_datasets_quality_included"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_finetune_datasets_qualityScore"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_finetune_datasets_includedInTraining"`);

    // Drop ai_interactions indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_interactions_prompt_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_interactions_session_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_interactions_modelUsed"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_interactions_success"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_interactions_createdAt"`);

    // Drop ai_sessions indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sessions_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sessions_user_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sessions_endedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sessions_startedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_sessions_sessionType"`);

    // Drop ai_prompts indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_prompts_active_model"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_prompts_modelPreference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_prompts_isActive"`);

    // Drop kyc_documents indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_documents_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_documents_documentType"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_documents_status"`);

    // Drop bundles indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundles_seeker_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundles_expiryDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundles_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundles_isActive"`);

    // Drop references indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_referrer_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_seeker_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_rcsScore"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_expiryDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_format"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_status"`);

    // Drop users indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_emailVerified"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_kycStatus"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_role"`);
  }
}
