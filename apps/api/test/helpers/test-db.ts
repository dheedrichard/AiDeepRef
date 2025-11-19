import { DataSource } from 'typeorm';
import { User, Reference, Bundle, KYCDocument } from '../../src/database/entities';

export class TestDatabase {
  private dataSource: DataSource;

  async connect(): Promise<DataSource> {
    const isTestEnv = process.env.NODE_ENV === 'test';

    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.TEST_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.TEST_DATABASE_PORT || '5432'),
      username: process.env.TEST_DATABASE_USERNAME || 'deepref_test',
      password: process.env.TEST_DATABASE_PASSWORD || 'test_password',
      database: process.env.TEST_DATABASE_NAME || 'deepref_test',
      entities: [User, Reference, Bundle, KYCDocument],
      synchronize: true, // Auto-create schema for testing
      dropSchema: true, // Drop schema before each test run
      logging: false,
    });

    await this.dataSource.initialize();
    return this.dataSource;
  }

  async disconnect(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  async cleanDatabase(): Promise<void> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Database not connected');
    }

    const entities = this.dataSource.entityMetadatas;

    // Disable foreign key checks
    await this.dataSource.query('SET session_replication_role = replica;');

    // Clear all tables
    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    // Re-enable foreign key checks
    await this.dataSource.query('SET session_replication_role = DEFAULT;');
  }

  getDataSource(): DataSource {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Database not connected');
    }
    return this.dataSource;
  }
}

export const testDb = new TestDatabase();
