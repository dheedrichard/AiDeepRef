# Database Migrations Guide

## Overview

DeepRef uses TypeORM migrations for database schema management. This document provides comprehensive guidance on working with migrations.

## Table of Contents

1. [Critical Configuration](#critical-configuration)
2. [Migration Structure](#migration-structure)
3. [Available Commands](#available-commands)
4. [Creating Migrations](#creating-migrations)
5. [Running Migrations](#running-migrations)
6. [Testing Migrations](#testing-migrations)
7. [Rollback Strategy](#rollback-strategy)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Critical Configuration

### Database Safety

**CRITICAL: TypeORM `synchronize` is DISABLED**

The `synchronize: true` option has been permanently disabled to prevent data loss. This setting automatically alters database schema based on entity changes, which can cause:

- Data loss in production
- Unintended schema changes
- Missing migration history
- Difficult rollbacks

**Always use migrations for schema changes.**

### Environment Variables

Required configuration in `.env`:

```bash
# Database Connection
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=deepref
DATABASE_USER=deepref
DATABASE_PASSWORD=your_secure_password

# Database Security & Behavior
DATABASE_SSL=false                    # Set to 'true' in production
DATABASE_LOGGING=false                # Set to 'true' for debugging
DATABASE_SYNCHRONIZE=false            # NEVER set to true
DATABASE_MIGRATIONS_RUN=true          # Auto-run migrations on startup

# Connection Pool
DATABASE_POOL_MAX=20                  # Maximum connections
DATABASE_POOL_MIN=5                   # Minimum connections
```

## Migration Structure

### Current Migrations

1. **InitialSchema** (1732025000001)
   - Creates core tables: users, references, bundles, kyc_documents
   - Sets up basic indexes and foreign keys
   - Enables UUID extension

2. **AISystemTables** (1732025000002)
   - Creates AI system tables: ai_prompts, ai_sessions, ai_interactions, ai_finetune_datasets
   - Establishes relationships between AI tables and users
   - Adds check constraints for data validation

3. **CreateIndexes** (1732025000003)
   - Performance indexes for all tables
   - Composite indexes for common queries
   - Full-text search indexes (PostgreSQL GIN)

### Entity Structure

#### Core Entities
- `User` - User accounts (seekers, referrers, employers)
- `Reference` - Professional references
- `Bundle` - Reference bundles for sharing
- `KYCDocument` - KYC verification documents

#### AI System Entities
- `AIPrompt` - AI agent system prompts (encrypted)
- `AISession` - User AI interaction sessions
- `AIInteraction` - Individual AI conversations
- `AIFinetuneDataset` - Training data collection

## Available Commands

### Migration Commands

```bash
# Show migration status
npm run migration:show

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Create empty migration file
npm run migration:create -- src/database/migrations/MigrationName

# Drop entire schema (DANGEROUS - use with caution)
npm run schema:drop

# Synchronize schema (DISABLED - use migrations instead)
npm run schema:sync
```

### Testing Commands

```bash
# Run migration tests
npm run test:migration

# Run all tests with coverage
npm run test:cov
```

## Creating Migrations

### Method 1: Generate from Entity Changes (Recommended)

When you modify entities, TypeORM can auto-generate migration:

```bash
npm run migration:generate -- src/database/migrations/AddUserPreferences
```

This analyzes entity changes and creates appropriate SQL.

### Method 2: Create Empty Migration

For complex changes, create an empty migration:

```bash
npm run migration:create -- src/database/migrations/AddCustomIndexes
```

Then manually write the `up` and `down` methods.

### Migration Template

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName1234567890 implements MigrationInterface {
  name = 'MigrationName1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Forward migration
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "preferences" jsonb DEFAULT '{}'
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_preferences"
      ON "users" USING gin("preferences")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback migration
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_preferences"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "preferences"`);
  }
}
```

### Best Practices for Writing Migrations

1. **Always provide rollback logic** in `down()` method
2. **Use transactions** - TypeORM wraps migrations in transactions by default
3. **Test rollbacks** before committing
4. **Keep migrations small** - one logical change per migration
5. **Never modify committed migrations** - create new ones instead
6. **Use descriptive names** - `AddUserPreferences` not `UpdateUsers`

## Running Migrations

### Development Environment

```bash
# Check what will run
npm run migration:show

# Run all pending migrations
npm run migration:run
```

### Production Environment

**Option 1: Auto-run on startup** (Current configuration)
```bash
# Set in .env
DATABASE_MIGRATIONS_RUN=true

# Migrations run automatically when application starts
npm run start:prod
```

**Option 2: Manual execution** (Recommended for production)
```bash
# Set in .env
DATABASE_MIGRATIONS_RUN=false

# Run migrations manually before deployment
npm run migration:run

# Then start application
npm run start:prod
```

### CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
- name: Run Migrations
  run: |
    npm run migration:run
  env:
    DATABASE_HOST: ${{ secrets.DB_HOST }}
    DATABASE_NAME: ${{ secrets.DB_NAME }}
    DATABASE_USER: ${{ secrets.DB_USER }}
    DATABASE_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

## Testing Migrations

### Unit Tests

Migration tests are in `src/database/migrations/migrations.spec.ts`:

```bash
# Run migration tests only
npm run test:migration

# Run all tests
npm run test
```

### Test Coverage

Tests verify:
- ✓ Migrations run successfully
- ✓ Tables and columns are created
- ✓ Indexes are created
- ✓ Constraints are enforced
- ✓ Foreign keys work correctly
- ✓ Rollbacks work properly
- ✓ Data integrity is maintained

### Manual Testing

```bash
# 1. Start with clean database
npm run schema:drop

# 2. Run migrations
npm run migration:run

# 3. Verify tables
psql -d deepref -c "\dt"

# 4. Verify indexes
psql -d deepref -c "\di"

# 5. Test rollback
npm run migration:revert

# 6. Verify rollback
psql -d deepref -c "\dt"
```

## Rollback Strategy

### Rolling Back

```bash
# Revert last migration
npm run migration:revert

# Revert multiple migrations (run multiple times)
npm run migration:revert
npm run migration:revert
npm run migration:revert
```

### Emergency Rollback Procedure

If a migration fails in production:

1. **Immediate action**:
   ```bash
   # Revert the problematic migration
   npm run migration:revert
   ```

2. **Verify rollback**:
   ```bash
   # Check migration status
   npm run migration:show

   # Verify data integrity
   psql -d deepref -c "SELECT COUNT(*) FROM users"
   ```

3. **Fix and redeploy**:
   - Fix the migration locally
   - Test thoroughly
   - Create new migration (don't modify existing)
   - Deploy again

### Rollback Best Practices

1. **Always test rollbacks** before deploying
2. **Backup database** before running migrations in production
3. **Have rollback plan** documented
4. **Monitor migration execution** in production
5. **Keep backups** for at least 30 days

## Seeding Data

### AI Prompts Seed

To seed AI system prompts:

```typescript
import dataSource from './ormconfig';
import { seedAIPrompts } from './src/database/seeds/ai-prompts.seed';

async function seed() {
  await dataSource.initialize();
  await seedAIPrompts(dataSource);
  await dataSource.destroy();
}

seed();
```

Or create a seed script in `package.json`:

```json
{
  "scripts": {
    "seed:ai-prompts": "ts-node -r tsconfig-paths/register src/database/seeds/run-ai-prompts-seed.ts"
  }
}
```

### Seed Best Practices

1. **Idempotent seeds** - check if data exists before inserting
2. **Environment-specific** - different data for dev/staging/prod
3. **Version control** - commit seed files
4. **Document dependencies** - which seeds depend on others

## Best Practices

### Schema Changes

1. **Breaking changes**:
   - Add new nullable column first
   - Migrate data
   - Make column non-nullable in separate migration

2. **Renaming**:
   ```sql
   -- Don't drop and recreate
   ALTER TABLE "users" RENAME COLUMN "name" TO "fullName";
   ```

3. **Removing columns**:
   - Deprecate in code first
   - Remove from queries
   - Drop column in later migration

### Performance

1. **Create indexes concurrently** (PostgreSQL):
   ```sql
   CREATE INDEX CONCURRENTLY "IDX_users_email" ON "users"("email");
   ```

2. **Large data migrations**:
   - Process in batches
   - Use pagination
   - Monitor memory usage

3. **Add indexes after bulk inserts**:
   ```sql
   -- Insert data first
   INSERT INTO users ...;

   -- Then create indexes
   CREATE INDEX ...;
   ```

### Security

1. **Encrypt sensitive data** in prompts and interactions
2. **Use environment variables** for credentials
3. **Never commit** `.env` files
4. **Audit migration changes** in code review
5. **Test with production-like data**

## Troubleshooting

### Common Issues

#### 1. Migration already exists

**Error**: `Migration already exists`

**Solution**:
```bash
# Check migration status
npm run migration:show

# If already run, no action needed
# If stuck, check migrations table
psql -d deepref -c "SELECT * FROM migrations"
```

#### 2. Connection timeout

**Error**: `Connection timeout`

**Solution**:
- Check database is running
- Verify credentials in `.env`
- Check network connectivity
- Increase pool size

#### 3. Foreign key constraint violation

**Error**: `Foreign key constraint violation`

**Solution**:
- Ensure parent records exist
- Check cascade settings
- Verify migration order

#### 4. Unique constraint violation

**Error**: `Duplicate key value violates unique constraint`

**Solution**:
- Check for existing data
- Clean test data
- Make seeds idempotent

### Debug Mode

Enable verbose logging:

```bash
# In .env
DATABASE_LOGGING=true

# Run migration with logging
npm run migration:run
```

### Getting Help

1. Check migration status: `npm run migration:show`
2. Review migration files in `src/database/migrations/`
3. Check TypeORM documentation: https://typeorm.io/migrations
4. Review error logs in `logs/error.log`
5. Contact DevOps team for production issues

## Database Schema Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├─────────┬─────────────────┐
       │         │                 │
┌──────▼────┐ ┌─▼──────────┐ ┌────▼─────────┐
│references │ │  bundles   │ │ kyc_documents│
└─────┬─────┘ └─────┬──────┘ └──────────────┘
      │             │
      └─────┬───────┘
            │
    ┌───────▼──────────┐
    │bundle_references │
    └──────────────────┘

AI System Tables:
┌─────────────┐
│    users    │
└──────┬──────┘
       │
┌──────▼────────┐     ┌──────────────┐
│  ai_sessions  │────▶│ ai_prompts   │
└──────┬────────┘     └──────────────┘
       │
┌──────▼──────────────┐
│  ai_interactions    │
└──────┬──────────────┘
       │
┌──────▼──────────────────┐
│ ai_finetune_datasets    │
└─────────────────────────┘
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review slow queries and add indexes if needed
2. **Monthly**: Analyze migration performance
3. **Quarterly**: Review and archive old data
4. **Yearly**: Schema optimization review

### Monitoring

Monitor these metrics:
- Migration execution time
- Database size growth
- Index usage statistics
- Query performance

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Check table sizes
SELECT tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Version History

- **v1.0.0** (2024-11-19)
  - Initial schema with users, references, bundles, kyc_documents
  - AI system tables
  - Performance indexes
  - Full-text search support

## Additional Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DeepRef API Documentation](./README.md)
- [Database Design Document](./docs/DATABASE_DESIGN.md)

---

**Last Updated**: 2024-11-19
**Maintained By**: DeepRef Backend Team
**Questions**: Contact #backend-support on Slack
