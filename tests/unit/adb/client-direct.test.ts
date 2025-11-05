// Mock child_process before importing AdbClient
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn
}));

import { AdbClient } from '../../../src/adb/client';

describe('AdbClient Direct Test', () => {
  let adbClient: AdbClient;

  beforeEach(() => {
    adbClient = new AdbClient();
    mockSpawn.mockClear();
  });

  it('should execute command successfully', async () => {
    // Create a mock process that resolves immediately
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

    mockSpawn.mockReturnValue(mockProcess);

    const result = await adbClient.executeCommand('version');

    expect(result.success).toBe(true);
    expect(result.stdout).toBe('Success');
    expect(mockSpawn).toHaveBeenCalledWith('adb version', { shell: true });
  }, 5000); // 5 second timeout
});
