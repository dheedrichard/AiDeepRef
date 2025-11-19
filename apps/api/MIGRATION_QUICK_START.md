# Database Migration Quick Start Guide

## First Time Setup

### 1. Install Dependencies

```bash
cd apps/api
npm install
```

### 2. Configure Database

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Update database credentials:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=deepref
DATABASE_USER=deepref
DATABASE_PASSWORD=your_password_here
```

### 3. Run Migrations

```bash
# Check migration status
npm run migration:show

# Run all pending migrations
npm run migration:run
```

### 4. Seed AI Prompts

```bash
# Seed AI system prompts
npm run seed:ai-prompts
```

### 5. Verify Setup

```bash
# Connect to database
psql -d deepref

# Check tables
\dt

# Check AI prompts
SELECT "promptId", name, version FROM ai_prompts;

# Exit
\q
```

## Common Operations

### Check Migration Status

```bash
npm run migration:show
```

Output shows:
- `[X]` - Migration has run
- `[ ]` - Migration pending

### Run Migrations

```bash
npm run migration:run
```

### Rollback Last Migration

```bash
npm run migration:revert
```

### Create New Migration

```bash
# Generate from entity changes (recommended)
npm run migration:generate -- src/database/migrations/DescriptiveName

# Or create empty migration
npm run migration:create -- src/database/migrations/DescriptiveName
```

### Test Migrations

```bash
npm run test:migration
```

## Database Schema

### Core Tables

- **users** - User accounts (seekers, referrers, employers)
- **references** - Professional references
- **bundles** - Reference bundles for sharing
- **kyc_documents** - KYC verification documents

### AI System Tables

- **ai_prompts** - AI agent system prompts (4 agents)
- **ai_sessions** - User AI interaction sessions
- **ai_interactions** - Individual AI conversations
- **ai_finetune_datasets** - Training data collection

## AI Agents

Four pre-configured AI agents:

1. **Reference Coach** (Sonnet 4.5)
   - Helps users create and manage references
   - Provides guidance and best practices

2. **Verification Orchestrator** (Opus 4.1)
   - Coordinates verification process
   - Calculates Reference Credibility Score (RCS)

3. **Authenticity Analyzer** (Sonnet 4.5)
   - Detects deepfakes and AI-generated content
   - Verifies referrer identity

4. **Reference Intelligence** (Sonnet 4.5)
   - Provides analytics and insights
   - Recommends improvements

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Or on macOS
brew services list

# Check credentials in .env file
cat .env | grep DATABASE
```

### Migration Failed

```bash
# Rollback last migration
npm run migration:revert

# Check error logs
tail -f logs/error.log

# Try again
npm run migration:run
```

### Seed Data Already Exists

```bash
# Update existing prompts (overwrite)
npm run seed:ai-prompts:update
```

## Environment Configuration

### Development

```env
NODE_ENV=development
DATABASE_LOGGING=true
DATABASE_MIGRATIONS_RUN=true
DATABASE_SSL=false
```

### Production

```env
NODE_ENV=production
DATABASE_LOGGING=false
DATABASE_MIGRATIONS_RUN=false  # Run manually
DATABASE_SSL=true
DATABASE_POOL_MAX=20
```

## NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run migration:show` | Show migration status |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Rollback last migration |
| `npm run migration:generate` | Generate migration from entities |
| `npm run migration:create` | Create empty migration |
| `npm run test:migration` | Run migration tests |
| `npm run seed:ai-prompts` | Seed AI prompts |
| `npm run seed:ai-prompts:update` | Update AI prompts |

## Critical Safety Rules

1. ⚠️ **NEVER** set `DATABASE_SYNCHRONIZE=true` in production
2. ⚠️ **ALWAYS** test migrations in development first
3. ⚠️ **ALWAYS** backup database before running migrations in production
4. ⚠️ **NEVER** modify committed migration files
5. ⚠️ **ALWAYS** write rollback logic in migrations

## Getting Help

- Full documentation: [DATABASE_MIGRATIONS.md](./DATABASE_MIGRATIONS.md)
- Entity definitions: `src/database/entities/`
- Migration files: `src/database/migrations/`
- Seed data: `src/database/seeds/`

## Next Steps

1. ✅ Migrations are set up and ready
2. ✅ Database schema is created
3. ✅ AI prompts are seeded
4. 🔄 Start developing your features
5. 🔄 Create new migrations as needed
6. 🔄 Write tests for your database operations

---

**Need more details?** See [DATABASE_MIGRATIONS.md](./DATABASE_MIGRATIONS.md) for comprehensive documentation.
