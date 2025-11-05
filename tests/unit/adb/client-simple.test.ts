import { AdbClient } from '../../../src/adb/client';

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

import { spawn } from 'child_process';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('AdbClient Simple Test', () => {
  let adbClient: AdbClient;

  beforeEach(() => {
    adbClient = new AdbClient();
    jest.clearAllMocks();
  });

  it('should execute command successfully', async () => {
    // Create a simple mock process
    const mockProcess = {
      stdout: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from('Success')), 5);
          }
          if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        })
      },
      stderr: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from('')), 5);
          }
          if (event === 'end') {
            setTimeout(() => callback(), 10);
          }
        })
      },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 15);
        }
      })
    };

    mockSpawn.mockReturnValue(mockProcess as any);

    const result = await adbClient.executeCommand('version');

    expect(result.success).toBe(true);
    expect(result.stdout).toBe('Success');
    expect(mockSpawn).toHaveBeenCalledWith('adb version', { shell: true });
  });
});
