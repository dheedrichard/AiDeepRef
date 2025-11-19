/**
 * Migration Test Setup
 *
 * This file runs before all migration tests to ensure the test environment is properly configured.
 */

import { config } from 'dotenv';

// Load environment variables for tests
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_NAME = process.env.TEST_DATABASE_NAME || 'deepref_test';
process.env.DATABASE_SYNCHRONIZE = 'false';
process.env.DATABASE_LOGGING = 'false';

console.log('Migration test environment configured');
console.log(`Database: ${process.env.DATABASE_NAME}`);
