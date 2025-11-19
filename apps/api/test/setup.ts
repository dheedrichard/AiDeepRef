// Global test setup
// This file runs once before all tests

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for slower machines
jest.setTimeout(30000);

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
