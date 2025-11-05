import { AdbClient } from '../../../src/adb/client';

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

import { spawn } from 'child_process';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('AdbClient Debug Test', () => {
  let adbClient: AdbClient;

  beforeEach(() => {
    adbClient = new AdbClient();
    jest.clearAllMocks();
  });

  it('should handle basic command execution', async () => {
    console.log('Starting test...');
    
    // Mock the spawn function to return a resolved promise immediately
    mockSpawn.mockImplementation(() => {
      console.log('Spawn called');
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };
      
      // Simulate immediate success
      setTimeout(() => {
        console.log('Firing events...');
        if (mockProcess.on.mock.calls.length > 0) {
          const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')?.[1];
          if (closeCallback) {
            console.log('Calling close callback');
            closeCallback(0);
          }
        }
      }, 1);
      
      return mockProcess as any;
    });

    console.log('Calling executeCommand...');
    const result = await adbClient.executeCommand('version');
    console.log('Got result:', result);

    expect(result.success).toBe(true);
  }, 5000); // 5 second timeout
});
