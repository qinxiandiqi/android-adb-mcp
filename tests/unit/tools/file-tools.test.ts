import fileTools from '@/tools/file-tools';
import { AdbClient } from '@/adb/client';

// Mock the ADBClient
jest.mock('@/adb/client');
const MockedAdbClient = AdbClient as jest.MockedClass<typeof AdbClient>;

describe('FileTools', () => {
  let mockClient: jest.Mocked<AdbClient>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mock client instance
    mockClient = new MockedAdbClient() as jest.Mocked<AdbClient>;
    
    // Mock the methods
    mockClient.isAvailable = jest.fn();
    mockClient.isDeviceConnected = jest.fn();
    mockClient.executeShell = jest.fn();
    mockClient.pushFile = jest.fn();
    mockClient.pullFile = jest.fn();
  });

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      const deviceId = 'emulator-5554';
      const path = '/sdcard';
      const mockResult = {
        success: true,
        stdout: 'drwxrwx--x 10 root sdcard_rw 4096 2023-01-01 12:00 .\n' +
                  'drwxrwx--x 10 root sdcard_rw 4096 2023-01-01 12:00 ..\n' +
                  '-rw-rw---- 1 root sdcard_rw 1024 2023-01-01 12:00 file1.txt\n' +
                  '-rw-rw---- 1 root sdcard_rw 2048 2023-01-01 12:00 file2.jpg',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await fileTools.listFiles.handler({ deviceId, path });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.isDeviceConnected).toHaveBeenCalledWith(deviceId);
      expect(mockClient.executeShell).toHaveBeenCalledWith(`ls -la "${path}"`, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.path).toBe(path);
      expect(result.data.files).toHaveLength(2);
      expect(result.data.files[0]).toEqual({
        permissions: '-rw-rw----',
        owner: 'root',
        group: 'sdcard_rw',
        size: '1024',
        date: '2023-01-01 12:00',
        name: 'file1.txt',
        type: 'file'
      });
    });

    it('should use default path when not specified', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: true,
        stdout: 'drwxrwx--x 10 root sdcard_rw 4096 2023-01-01 12:00 .\n' +
                  'drwxrwx--x 10 root sdcard_rw 4096 2023-01-01 12:00 ..',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await fileTools.listFiles.handler({ deviceId });

      expect(mockClient.executeShell).toHaveBeenCalledWith('ls -la "/sdcard/"', deviceId);
      expect(result.success).toBe(true);
      expect(result.data.path).toBe('/sdcard/');
    });

    it('should handle ls command failure', async () => {
      const deviceId = 'emulator-5554';
      const path = '/nonexistent';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'ls: /nonexistent: No such file or directory',
        exitCode: 1
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      await expect(fileTools.listFiles.handler({ deviceId, path }))
        .rejects.toThrow('Failed to list files: ls: /nonexistent: No such file or directory');
    });
  });

  describe('pushFile', () => {
    it('should push file to device successfully', async () => {
      const deviceId = 'emulator-5554';
      const localPath = '/local/test.txt';
      const remotePath = '/sdcard/test.txt';
      const mockResult = {
        success: true,
        stdout: '/local/test.txt: 1 file pushed, 0 skipped.',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.pushFile.mockResolvedValue(mockResult);

      const result = await fileTools.pushFile.handler({ deviceId, localPath, remotePath });

      expect(mockClient.pushFile).toHaveBeenCalledWith(localPath, remotePath, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.localPath).toBe(localPath);
      expect(result.data.remotePath).toBe(remotePath);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle push failure', async () => {
      const deviceId = 'emulator-5554';
      const localPath = '/local/nonexistent.txt';
      const remotePath = '/sdcard/test.txt';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'failed to stat \'/local/nonexistent.txt\': No such file or directory',
        exitCode: 1
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.pushFile.mockResolvedValue(mockResult);

      const result = await fileTools.pushFile.handler({ deviceId, localPath, remotePath });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.localPath).toBe(localPath);
      expect(result.data.remotePath).toBe(remotePath);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(1);
    });
  });

  describe('pullFile', () => {
    it('should pull file from device successfully', async () => {
      const deviceId = 'emulator-5554';
      const remotePath = '/sdcard/test.txt';
      const localPath = '/local/test.txt';
      const mockResult = {
        success: true,
        stdout: '/sdcard/test.txt: 1 file pulled.',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.pullFile.mockResolvedValue(mockResult);

      const result = await fileTools.pullFile.handler({ deviceId, remotePath, localPath });

      expect(mockClient.pullFile).toHaveBeenCalledWith(remotePath, localPath, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.remotePath).toBe(remotePath);
      expect(result.data.localPath).toBe(localPath);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle pull failure', async () => {
      const deviceId = 'emulator-5554';
      const remotePath = '/sdcard/nonexistent.txt';
      const localPath = '/local/test.txt';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'failed to stat \'/sdcard/nonexistent.txt\': No such file or directory',
        exitCode: 1
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.pullFile.mockResolvedValue(mockResult);

      const result = await fileTools.pullFile.handler({ deviceId, remotePath, localPath });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.remotePath).toBe(remotePath);
      expect(result.data.localPath).toBe(localPath);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(1);
    });
  });

  describe('createDirectory', () => {
    it('should create directory successfully', async () => {
      const deviceId = 'emulator-5554';
      const path = '/sdcard/newdir';
      const mockResult = {
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await fileTools.createDirectory.handler({ deviceId, path });

      expect(mockClient.executeShell).toHaveBeenCalledWith(`mkdir -p "${path}"`, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.path).toBe(path);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle mkdir failure', async () => {
      const deviceId = 'emulator-5554';
      const path = '/invalid/path';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'mkdir: failed to create directory: Permission denied',
        exitCode: 1
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await fileTools.createDirectory.handler({ deviceId, path });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.path).toBe(path);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(1);
    });
  });

  describe('removeFile', () => {
    it('should remove file successfully', async () => {
      const deviceId = 'emulator-5554';
      const path = '/sdcard/test.txt';
      const mockResult = {
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await fileTools.removeFile.handler({ deviceId, path });

      expect(mockClient.executeShell).toHaveBeenCalledWith(`rm -f "${path}"`, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.path).toBe(path);
      expect(result.data.recursive).toBe(false);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(0);
    });

    it('should remove directory recursively', async () => {
      const deviceId = 'emulator-5554';
      const path = '/sdcard/testdir';
      const recursive = true;
      const mockResult = {
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await fileTools.removeFile.handler({ deviceId, path, recursive });

      expect(mockClient.executeShell).toHaveBeenCalledWith(`rm -rf "${path}"`, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.path).toBe(path);
      expect(result.data.recursive).toBe(true);
    });

    it('should handle rm failure', async () => {
      const deviceId = 'emulator-5554';
      const path = '/sdcard/protected.txt';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'rm: cannot remove \'/sdcard/protected.txt\': Permission denied',
        exitCode: 1
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await fileTools.removeFile.handler({ deviceId, path });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.path).toBe(path);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(1);
    });
  });

  describe('getFileInfo', () => {
    it('should get file information successfully', async () => {
      const deviceId = 'emulator-5554';
      const path = '/sdcard/test.txt';
      const mockResult = {
        success: true,
        stdout: '  File: /sdcard/test.txt\n  Size: 1024\n  Access: 2023-01-01 12:00:00.000000000 +0000\n  Modify: 2023-01-01 12:00:00.000000000 +0000\n  Change: 2023-01-01 12:00:00.000000000 +0000',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await fileTools.getFileInfo.handler({ deviceId, path });

      expect(mockClient.executeShell).toHaveBeenCalledWith(`stat "${path}"`, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.fileInfo.path).toBe(path);
      expect(result.data.fileInfo.exists).toBe(true);
      expect(result.data.fileInfo.size).toBe(1024);
      expect(result.data.fileInfo.accessTime).toBe('2023-01-01 12:00:00.000000000 +0000');
      expect(result.data.rawOutput).toBe(mockResult.stdout);
    });

    it('should handle stat failure', async () => {
      const deviceId = 'emulator-5554';
      const path = '/sdcard/nonexistent.txt';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'stat: /sdcard/nonexistent.txt: No such file or directory',
        exitCode: 1
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      await expect(fileTools.getFileInfo.handler({ deviceId, path }))
        .rejects.toThrow('Failed to get file info: stat: /sdcard/nonexistent.txt: No such file or directory');
    });
  });

  describe('tool definitions', () => {
    it('should have correct tool definitions', () => {
      expect(fileTools.listFiles.name).toBe('list_files');
      expect(fileTools.listFiles.description).toBe('List files and directories in a specified path on the device');
      expect(fileTools.pushFile.name).toBe('push_file');
      expect(fileTools.pushFile.description).toBe('Push a file from local machine to the Android device');
      expect(fileTools.pullFile.name).toBe('pull_file');
      expect(fileTools.pullFile.description).toBe('Pull a file from the Android device to local machine');
      expect(fileTools.createDirectory.name).toBe('create_directory');
      expect(fileTools.createDirectory.description).toBe('Create a directory on the Android device');
      expect(fileTools.removeFile.name).toBe('remove_file');
      expect(fileTools.removeFile.description).toBe('Remove a file or directory on the Android device');
      expect(fileTools.getFileInfo.name).toBe('get_file_info');
      expect(fileTools.getFileInfo.description).toBe('Get detailed information about a file on the device');
    });

    it('should have correct input schemas', () => {
      expect(fileTools.listFiles.inputSchema.required).toEqual([]);
      expect(fileTools.pushFile.inputSchema.required).toEqual(['localPath', 'remotePath']);
      expect(fileTools.pullFile.inputSchema.required).toEqual(['remotePath', 'localPath']);
      expect(fileTools.createDirectory.inputSchema.required).toEqual(['path']);
      expect(fileTools.removeFile.inputSchema.required).toEqual(['path']);
      expect(fileTools.getFileInfo.inputSchema.required).toEqual(['path']);
    });

    it('should have correct default values', () => {
      expect(fileTools.listFiles.inputSchema.properties.path.default).toBe('/sdcard/');
      expect(fileTools.removeFile.inputSchema.properties.recursive.default).toBe(false);
    });
  });
});
