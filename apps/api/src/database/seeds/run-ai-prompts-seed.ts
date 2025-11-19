#!/usr/bin/env ts-node

/**
 * AI Prompts Seed Runner
 *
 * This script seeds the AI prompts into the database.
 * Run with: npm run seed:ai-prompts
 */

import dataSource from '../../../ormconfig';
import { seedAIPrompts, updateAIPrompts } from './ai-prompts.seed';

async function main() {
  try {
    console.log('Connecting to database...');
    await dataSource.initialize();
    console.log('Connected successfully!');

    const args = process.argv.slice(2);
    const shouldUpdate = args.includes('--update');

    if (shouldUpdate) {
      console.log('\nUpdating AI prompts (will overwrite existing)...\n');
      await updateAIPrompts(dataSource);
    } else {
      console.log('\nSeeding AI prompts (will skip existing)...\n');
      await seedAIPrompts(dataSource);
    }

    console.log('\n✓ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seed failed:');
    console.error(error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Run the seed
main();
