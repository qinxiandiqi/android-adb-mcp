import 'jest';

// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock setTimeout and setInterval for faster tests
jest.useFakeTimers();

// Set default test timeout
jest.setTimeout(30000);
