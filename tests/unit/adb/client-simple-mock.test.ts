import { AdbClient } from '../../../src/adb/client';
import { mockSpawn, createMockProcess, mockSuccessResult, mockFailureResult } from '../../mocks/adb-mocks-simple';

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('AdbClient Simple Mock Test', () => {
  let adbClient: AdbClient;

  beforeEach(() => {
    adbClient = new AdbClient();
    jest.clearAllMocks();
  });

  it('should execute command successfully', async () => {
    const mockProcess = createMockProcess(mockSuccessResult);
    mockSpawn.mockReturnValue(mockProcess);

    const result = await adbClient.executeCommand('version');

    expect(result).toEqual(mockSuccessResult);
    expect(mockSpawn).toHaveBeenCalledWith('adb version', { shell: true });
  });

  it('should handle command failure', async () => {
    const mockProcess = createMockProcess(mockFailureResult);
    mockSpawn.mockReturnValue(mockProcess);

    const result = await adbClient.executeCommand('invalid-command');

    expect(result).toEqual(mockFailureResult);
  });
});
