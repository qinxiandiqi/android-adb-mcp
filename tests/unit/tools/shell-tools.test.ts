import shellTools from '@/tools/shell-tools';
import { AdbClient } from '@/adb/client';

// Mock the ADBClient
jest.mock('@/adb/client');
const MockedAdbClient = AdbClient as jest.MockedClass<typeof AdbClient>;

describe('ShellTools', () => {
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
  });

  describe('executeShell', () => {
    it('should execute shell command successfully', async () => {
      const deviceId = 'emulator-5554';
      const command = 'ls -la /sdcard';
      const mockResult = {
        success: true,
        stdout: 'drwxrwx--x 10 root sdcard_rw 4096 2023-01-01 12:00 .\n...',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.executeShell.handler({ deviceId, command });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.isDeviceConnected).toHaveBeenCalledWith(deviceId);
      expect(mockClient.executeShell).toHaveBeenCalledWith(command, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.command).toBe(command);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(0);
    });

    it('should execute shell command without deviceId', async () => {
      const command = 'echo "test"';
      const mockResult = {
        success: true,
        stdout: 'test',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.executeShell.handler({ command });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.isDeviceConnected).not.toHaveBeenCalled();
      expect(mockClient.executeShell).toHaveBeenCalledWith(command, undefined);
      expect(result.success).toBe(true);
      expect(result.data.command).toBe(command);
      expect(result.data.deviceId).toBeUndefined();
    });

    it('should throw error when ADB is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);

      await expect(shellTools.executeShell.handler({ command: 'ls' }))
        .rejects.toThrow('ADB is not available');
    });

    it('should throw error when device is not connected', async () => {
      const deviceId = 'nonexistent';
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(false);

      await expect(shellTools.executeShell.handler({ deviceId, command: 'ls' }))
        .rejects.toThrow('Device nonexistent is not connected or not authorized');
    });

    it('should handle command execution failure', async () => {
      const deviceId = 'emulator-5554';
      const command = 'invalid-command';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'sh: invalid-command: not found',
        exitCode: 127
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.executeShell.handler({ deviceId, command });

      expect(result.success).toBe(true); // Handler still returns success even if command fails
      expect(result.data.command).toBe(command);
      expect(result.data.stdout).toBe(mockResult.stdout);
      expect(result.data.stderr).toBe(mockResult.stderr);
      expect(result.data.exitCode).toBe(127);
    });
  });

  describe('getSystemProperties', () => {
    it('should get all system properties', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: true,
        stdout: '[ro.product.model]: [sdk_gphone_x86]\n[ro.product.manufacturer]: [Google]\n[ro.build.version.release]: [13]',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.getSystemProperties.handler({ deviceId });

      expect(mockClient.executeShell).toHaveBeenCalledWith('getprop', deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.property).toBeUndefined();
      expect(result.data.properties).toEqual({
        'ro.product.model': 'sdk_gphone_x86',
        'ro.product.manufacturer': 'Google',
        'ro.build.version.release': '13'
      });
    });

    it('should get specific system property', async () => {
      const deviceId = 'emulator-5554';
      const property = 'ro.product.model';
      const mockResult = {
        success: true,
        stdout: '[ro.product.model]: [sdk_gphone_x86]',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.getSystemProperties.handler({ deviceId, property });

      expect(mockClient.executeShell).toHaveBeenCalledWith(`getprop ${property}`, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.property).toBe(property);
      expect(result.data.properties).toEqual({
        'ro.product.model': 'sdk_gphone_x86'
      });
    });

    it('should handle getprop command failure', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'getprop: not found',
        exitCode: 127
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      await expect(shellTools.getSystemProperties.handler({ deviceId }))
        .rejects.toThrow('Failed to get system properties: getprop: not found');
    });
  });

  describe('listProcesses', () => {
    it('should list running processes', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: true,
        stdout: 'USER     PID   PPID  VSIZE  RSS   WCHAN            PC  NAME\nroot      1     0     1234   567   ffffffff 00000000 S /init\nsystem    1234  1     5678   890   ffffffff 00000000 S system_server',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.listProcesses.handler({ deviceId });

      expect(mockClient.executeShell).toHaveBeenCalledWith('ps -A', deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.processes).toHaveLength(2);
      expect(result.data.processes[0]).toEqual({
        user: 'root',
        pid: 1,
        ppid: 0,
        vsize: '1234',
        rss: '567',
        wchan: 'ffffffff',
        addr: '00000000',
        s: 'S',
        name: '/init'
      });
      expect(result.data.count).toBe(2);
    });

    it('should handle ps command failure', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'ps: not found',
        exitCode: 127
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      await expect(shellTools.listProcesses.handler({ deviceId }))
        .rejects.toThrow('Failed to list processes: ps: not found');
    });
  });

  describe('getMemoryInfo', () => {
    it('should get memory information', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: true,
        stdout: 'MemTotal:        4096000 kB\nMemFree:         2048000 kB\nCached:          1024000 kB',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.getMemoryInfo.handler({ deviceId });

      expect(mockClient.executeShell).toHaveBeenCalledWith('cat /proc/meminfo', deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.memoryInfo).toEqual({
        'MemTotal': { value: 4096000, unit: 'kB' },
        'MemFree': { value: 2048000, unit: 'kB' },
        'Cached': { value: 1024000, unit: 'kB' }
      });
    });

    it('should handle meminfo read failure', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'cat: /proc/meminfo: No such file or directory',
        exitCode: 1
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      await expect(shellTools.getMemoryInfo.handler({ deviceId }))
        .rejects.toThrow('Failed to get memory info: cat: /proc/meminfo: No such file or directory');
    });
  });

  describe('getDiskUsage', () => {
    it('should get disk usage with default path', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: true,
        stdout: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/rootfs    1.2G  856M  344M  72% /\n/dev/block/system 4.0G  3.2G  800M  80% /system',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.getDiskUsage.handler({ deviceId });

      expect(mockClient.executeShell).toHaveBeenCalledWith('df -h "/"', deviceId);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.path).toBe('/');
      expect(result.data.diskInfo).toHaveLength(2);
      expect(result.data.diskInfo[0]).toEqual({
        filesystem: '/dev/rootfs',
        size: '1.2G',
        used: '856M',
        available: '344M',
        usePercent: '72%',
        mountPoint: '/'
      });
    });

    it('should get disk usage with custom path', async () => {
      const deviceId = 'emulator-5554';
      const path = '/sdcard';
      const mockResult = {
        success: true,
        stdout: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/block/vold 25G  12G   13G  48% /storage/emulated',
        stderr: '',
        exitCode: 0
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      const result = await shellTools.getDiskUsage.handler({ deviceId, path });

      expect(mockClient.executeShell).toHaveBeenCalledWith(`df -h "${path}"`, deviceId);
      expect(result.success).toBe(true);
      expect(result.data.path).toBe(path);
    });

    it('should handle df command failure', async () => {
      const deviceId = 'emulator-5554';
      const mockResult = {
        success: false,
        stdout: '',
        stderr: 'df: not found',
        exitCode: 127
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue(mockResult);

      await expect(shellTools.getDiskUsage.handler({ deviceId }))
        .rejects.toThrow('Failed to get disk usage: df: not found');
    });
  });

  describe('tool definitions', () => {
    it('should have correct tool definitions', () => {
      expect(shellTools.executeShell.name).toBe('execute_shell');
      expect(shellTools.executeShell.description).toBe('Execute a shell command on Android device');
      expect(shellTools.getSystemProperties.name).toBe('get_system_properties');
      expect(shellTools.getSystemProperties.description).toBe('Get Android system properties');
      expect(shellTools.listProcesses.name).toBe('list_processes');
      expect(shellTools.listProcesses.description).toBe('List running processes on device');
      expect(shellTools.getMemoryInfo.name).toBe('get_memory_info');
      expect(shellTools.getMemoryInfo.description).toBe('Get memory usage information from device');
      expect(shellTools.getDiskUsage.name).toBe('get_disk_usage');
      expect(shellTools.getDiskUsage.description).toBe('Get disk usage information from device');
    });

    it('should have correct input schemas', () => {
      expect(shellTools.executeShell.inputSchema.required).toEqual(['command']);
      expect(shellTools.getSystemProperties.inputSchema.required).toEqual([]);
      expect(shellTools.listProcesses.inputSchema.required).toEqual([]);
      expect(shellTools.getMemoryInfo.inputSchema.required).toEqual([]);
      expect(shellTools.getDiskUsage.inputSchema.required).toEqual([]);
    });

    it('should have correct default values', () => {
      expect(shellTools.getDiskUsage.inputSchema.properties.path.default).toBe('/');
    });
  });
});
