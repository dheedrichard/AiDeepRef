import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1732025000001 implements MigrationInterface {
  name = 'InitialSchema1732025000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying,
        "role" character varying NOT NULL,
        "kycStatus" character varying NOT NULL DEFAULT 'pending',
        "emailVerified" boolean NOT NULL DEFAULT false,
        "emailVerificationCode" character varying,
        "emailVerificationExpiry" TIMESTAMP,
        "magicLinkToken" character varying,
        "magicLinkExpiry" TIMESTAMP,
        "profilePictureUrl" character varying,
        "phoneNumber" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastLoginAt" TIMESTAMP,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Create references table
    await queryRunner.query(`
      CREATE TABLE "references" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "seekerId" uuid NOT NULL,
        "referrerId" uuid NOT NULL,
        "referrerName" character varying NOT NULL,
        "referrerEmail" character varying NOT NULL,
        "company" character varying NOT NULL,
        "role" character varying NOT NULL,
        "questions" jsonb NOT NULL,
        "allowedFormats" jsonb NOT NULL,
        "allowEmployerReachback" boolean NOT NULL DEFAULT false,
        "status" character varying NOT NULL DEFAULT 'pending',
        "format" character varying,
        "contentUrl" character varying,
        "attachments" jsonb,
        "responses" jsonb,
        "rcsScore" decimal(5,2),
        "aiAuthenticityScore" integer,
        "deepfakeProbability" integer,
        "expiryDate" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "submittedAt" TIMESTAMP,
        CONSTRAINT "PK_references_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_references_seeker" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_references_referrer" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create bundles table
    await queryRunner.query(`
      CREATE TABLE "bundles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "seekerId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "shareLink" character varying NOT NULL,
        "password" character varying,
        "aggregatedRCS" decimal(5,2),
        "expiryDate" TIMESTAMP,
        "viewCount" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_bundles_shareLink" UNIQUE ("shareLink"),
        CONSTRAINT "PK_bundles_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bundles_seeker" FOREIGN KEY ("seekerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create bundle_references junction table
    await queryRunner.query(`
      CREATE TABLE "bundle_references" (
        "bundleId" uuid NOT NULL,
        "referenceId" uuid NOT NULL,
        CONSTRAINT "PK_bundle_references" PRIMARY KEY ("bundleId", "referenceId"),
        CONSTRAINT "FK_bundle_references_bundle" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_bundle_references_reference" FOREIGN KEY ("referenceId") REFERENCES "references"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    // Create kyc_documents table
    await queryRunner.query(`
      CREATE TABLE "kyc_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "documentType" character varying NOT NULL,
        "frontImageUrl" character varying NOT NULL,
        "backImageUrl" character varying,
        "selfieImageUrl" character varying,
        "status" character varying NOT NULL DEFAULT 'processing',
        "verificationData" jsonb,
        "livenessScore" integer,
        "failureReason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kyc_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_kyc_documents_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create basic indexes for initial schema
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_references_seekerId" ON "references" ("seekerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_references_referrerId" ON "references" ("referrerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_bundles_seekerId" ON "bundles" ("seekerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_kyc_documents_userId" ON "kyc_documents" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_documents_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundles_seekerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_referrerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_references_seekerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);

    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "kyc_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bundle_references"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bundles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "references"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // Optionally drop extension
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
