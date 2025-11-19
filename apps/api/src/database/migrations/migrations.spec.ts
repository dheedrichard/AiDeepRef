import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../../ormconfig';
import { InitialSchema1732025000001 } from './1732025000001-InitialSchema';
import { AISystemTables1732025000002 } from './1732025000002-AISystemTables';
import { CreateIndexes1732025000003 } from './1732025000003-CreateIndexes';

describe('Database Migrations', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    // Create a test database connection
    dataSource = new DataSource({
      ...dataSourceOptions,
      database: process.env.TEST_DATABASE_NAME || 'deepref_test',
      dropSchema: true, // Drop schema before each test run
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('InitialSchema Migration', () => {
    it('should run InitialSchema migration successfully', async () => {
      const migration = new InitialSchema1732025000001();
      const queryRunner = dataSource.createQueryRunner();

      try {
        await migration.up(queryRunner);

        // Verify tables were created
        const tables = await queryRunner.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename
        `);

        const tableNames = tables.map((t: any) => t.tablename);
        expect(tableNames).toContain('users');
        expect(tableNames).toContain('references');
        expect(tableNames).toContain('bundles');
        expect(tableNames).toContain('bundle_references');
        expect(tableNames).toContain('kyc_documents');

        // Verify uuid-ossp extension exists
        const extensions = await queryRunner.query(`
          SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp'
        `);
        expect(extensions).toHaveLength(1);
      } finally {
        await queryRunner.release();
      }
    });

    it('should rollback InitialSchema migration successfully', async () => {
      const migration = new InitialSchema1732025000001();
      const queryRunner = dataSource.createQueryRunner();

      try {
        await migration.down(queryRunner);

        // Verify tables were dropped
        const tables = await queryRunner.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename IN ('users', 'references', 'bundles', 'kyc_documents')
        `);

        expect(tables).toHaveLength(0);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('AISystemTables Migration', () => {
    beforeAll(async () => {
      // Run InitialSchema first (prerequisite)
      const initialMigration = new InitialSchema1732025000001();
      const queryRunner = dataSource.createQueryRunner();
      await initialMigration.up(queryRunner);
      await queryRunner.release();
    });

    it('should run AISystemTables migration successfully', async () => {
      const migration = new AISystemTables1732025000002();
      const queryRunner = dataSource.createQueryRunner();

      try {
        await migration.up(queryRunner);

        // Verify AI tables were created
        const tables = await queryRunner.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename LIKE 'ai_%'
          ORDER BY tablename
        `);

        const tableNames = tables.map((t: any) => t.tablename);
        expect(tableNames).toContain('ai_prompts');
        expect(tableNames).toContain('ai_sessions');
        expect(tableNames).toContain('ai_interactions');
        expect(tableNames).toContain('ai_finetune_datasets');

        // Verify foreign key constraints
        const constraints = await queryRunner.query(`
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'ai_sessions'
          AND constraint_type = 'FOREIGN KEY'
        `);
        expect(constraints.length).toBeGreaterThan(0);
      } finally {
        await queryRunner.release();
      }
    });

    it('should enforce check constraint on quality score', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Create test data
        await queryRunner.query(`
          INSERT INTO users (id, "firstName", "lastName", email, role)
          VALUES ('00000000-0000-0000-0000-000000000001', 'Test', 'User', 'test@example.com', 'seeker')
        `);

        await queryRunner.query(`
          INSERT INTO ai_prompts (id, "promptId", name, "systemPrompt", version, "modelPreference")
          VALUES ('00000000-0000-0000-0000-000000000002', 'test-prompt', 'Test Prompt', 'Test', '1.0', 'test-model')
        `);

        await queryRunner.query(`
          INSERT INTO ai_sessions (id, "agentId", "userId", "sessionType")
          VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'test')
        `);

        await queryRunner.query(`
          INSERT INTO ai_interactions (id, "sessionId", "promptId", "userInput", "aiResponse", "modelUsed")
          VALUES ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'test input', 'test response', 'test-model')
        `);

        // Try to insert invalid quality score (should fail)
        await expect(
          queryRunner.query(`
            INSERT INTO ai_finetune_datasets ("interactionId", "qualityScore")
            VALUES ('00000000-0000-0000-0000-000000000005', 10)
          `)
        ).rejects.toThrow();

        // Insert valid quality score (should succeed)
        await queryRunner.query(`
          INSERT INTO ai_finetune_datasets ("interactionId", "qualityScore")
          VALUES ('00000000-0000-0000-0000-000000000005', 5)
        `);

        const result = await queryRunner.query(
          `SELECT "qualityScore" FROM ai_finetune_datasets WHERE "interactionId" = '00000000-0000-0000-0000-000000000005'`
        );
        expect(result[0].qualityScore).toBe(5);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('CreateIndexes Migration', () => {
    beforeAll(async () => {
      // Run previous migrations first
      const queryRunner = dataSource.createQueryRunner();
      const initialMigration = new InitialSchema1732025000001();
      const aiMigration = new AISystemTables1732025000002();
      await initialMigration.up(queryRunner);
      await aiMigration.up(queryRunner);
      await queryRunner.release();
    });

    it('should create all performance indexes successfully', async () => {
      const migration = new CreateIndexes1732025000003();
      const queryRunner = dataSource.createQueryRunner();

      try {
        await migration.up(queryRunner);

        // Verify indexes were created
        const indexes = await queryRunner.query(`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = 'public'
          AND indexname LIKE 'IDX_%'
          ORDER BY indexname
        `);

        const indexNames = indexes.map((i: any) => i.indexname);

        // Check for some key indexes
        expect(indexNames).toContain('IDX_users_role');
        expect(indexNames).toContain('IDX_users_email');
        expect(indexNames).toContain('IDX_references_status');
        expect(indexNames).toContain('IDX_ai_prompts_promptId');
        expect(indexNames).toContain('IDX_ai_sessions_agentId');
        expect(indexNames).toContain('IDX_ai_interactions_sessionId');

        // Verify full-text search indexes
        expect(indexNames).toContain('IDX_references_fulltext');
        expect(indexNames).toContain('IDX_bundles_fulltext');
      } finally {
        await queryRunner.release();
      }
    });

    it('should improve query performance with indexes', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Insert test data
        await queryRunner.query(`
          INSERT INTO users (id, "firstName", "lastName", email, role)
          VALUES ('00000000-0000-0000-0000-000000000010', 'Performance', 'Test', 'perf@example.com', 'seeker')
        `);

        // Check query plan uses index
        const explain = await queryRunner.query(`
          EXPLAIN (FORMAT JSON)
          SELECT * FROM users WHERE role = 'seeker'
        `);

        const plan = JSON.stringify(explain);
        // Plan should mention index scan (not sequential scan for better performance)
        expect(plan.toLowerCase()).toContain('index');
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Data Integrity', () => {
    beforeAll(async () => {
      // Run all migrations
      const queryRunner = dataSource.createQueryRunner();
      const migration1 = new InitialSchema1732025000001();
      const migration2 = new AISystemTables1732025000002();
      const migration3 = new CreateIndexes1732025000003();

      await migration1.up(queryRunner);
      await migration2.up(queryRunner);
      await migration3.up(queryRunner);
      await queryRunner.release();
    });

    it('should maintain referential integrity with cascade deletes', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Create test user
        await queryRunner.query(`
          INSERT INTO users (id, "firstName", "lastName", email, role)
          VALUES ('00000000-0000-0000-0000-000000000020', 'Integrity', 'Test', 'integrity@example.com', 'seeker')
        `);

        // Create AI session for user
        await queryRunner.query(`
          INSERT INTO ai_sessions (id, "agentId", "userId", "sessionType")
          VALUES ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000020', 'test')
        `);

        // Verify session exists
        let sessions = await queryRunner.query(
          `SELECT * FROM ai_sessions WHERE "userId" = '00000000-0000-0000-0000-000000000020'`
        );
        expect(sessions).toHaveLength(1);

        // Delete user (should cascade delete session)
        await queryRunner.query(
          `DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000020'`
        );

        // Verify session was deleted
        sessions = await queryRunner.query(
          `SELECT * FROM ai_sessions WHERE "userId" = '00000000-0000-0000-0000-000000000020'`
        );
        expect(sessions).toHaveLength(0);
      } finally {
        await queryRunner.release();
      }
    });

    it('should enforce unique constraints', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Insert user with unique email
        await queryRunner.query(`
          INSERT INTO users (id, "firstName", "lastName", email, role)
          VALUES ('00000000-0000-0000-0000-000000000030', 'Unique', 'Test', 'unique@example.com', 'seeker')
        `);

        // Try to insert duplicate email (should fail)
        await expect(
          queryRunner.query(`
            INSERT INTO users (id, "firstName", "lastName", email, role)
            VALUES ('00000000-0000-0000-0000-000000000031', 'Duplicate', 'Test', 'unique@example.com', 'seeker')
          `)
        ).rejects.toThrow();
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('Migration Rollback', () => {
    it('should rollback all migrations in reverse order', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Run all migrations
        const migration1 = new InitialSchema1732025000001();
        const migration2 = new AISystemTables1732025000002();
        const migration3 = new CreateIndexes1732025000003();

        await migration1.up(queryRunner);
        await migration2.up(queryRunner);
        await migration3.up(queryRunner);

        // Rollback in reverse order
        await migration3.down(queryRunner);
        await migration2.down(queryRunner);
        await migration1.down(queryRunner);

        // Verify all tables are dropped
        const tables = await queryRunner.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
        `);

        // Should only have system tables left
        const userTables = tables.filter(
          (t: any) => !t.tablename.startsWith('pg_') && !t.tablename.startsWith('sql_')
        );
        expect(userTables).toHaveLength(0);
      } finally {
        await queryRunner.release();
      }
    });
  });
});
