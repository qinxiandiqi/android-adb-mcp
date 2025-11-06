import advancedTools from '@/tools/advanced-tools';
import { AdbClient } from '@/adb/client';

// Mock the AdbClient
jest.mock('@/adb/client');
const MockedAdbClient = AdbClient as jest.MockedClass<typeof AdbClient>;

describe('AdvancedTools', () => {
  let mockClient: jest.Mocked<AdbClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = new MockedAdbClient() as jest.Mocked<AdbClient>;

    mockClient.isAvailable = jest.fn();
    mockClient.executeCommand = jest.fn();
    mockClient.executeShell = jest.fn();
    mockClient.getDevices = jest.fn();
    mockClient.connect = jest.fn();
    mockClient.disconnect = jest.fn();
  });

  describe('executeBatch', () => {
    it('should execute multiple commands successfully', async () => {
      const commands = [
        { command: 'shell echo "test1"', description: 'Test command 1' },
        { command: 'shell echo "test2"', description: 'Test command 2' }
      ];

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeCommand
        .mockResolvedValueOnce({
          success: true,
          stdout: 'test1',
          stderr: '',
          exitCode: 0
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'test2',
          stderr: '',
          exitCode: 0
        });

      const result = await advancedTools.executeBatch.handler({ commands });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.executeCommand).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data.totalCommands).toBe(2);
      expect(result.data.successCount).toBe(2);
      expect(result.data.results).toHaveLength(2);
    });

    it('should stop on error when configured', async () => {
      const commands = [
        { command: 'shell echo "test1"' },
        { command: 'shell invalid_command' },
        { command: 'shell echo "test3"' }
      ];

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeCommand
        .mockResolvedValueOnce({
          success: true,
          stdout: 'test1',
          stderr: '',
          exitCode: 0
        })
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'Command not found',
          exitCode: 1
        });

      const result = await advancedTools.executeBatch.handler({
        commands,
        stopOnError: true
      });

      expect(result.data.results).toHaveLength(2);
      expect(result.data.successCount).toBe(1);
      expect(result.data.failureCount).toBe(1);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeShell
        .mockResolvedValueOnce({
          success: true,
          stdout: 'processor\t: 0\nprocessor\t: 1\ncpu MHz\t\t: 2400.000',
          stderr: '',
          exitCode: 0
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'cpu  100 200 300 400 500 600 700 800',
          stderr: '',
          exitCode: 0
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'MemTotal:        4096000 kB\nMemAvailable:     2048000 kB',
          stderr: '',
          exitCode: 0
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/root        2048000 1024000   1024000  50% /',
          stderr: '',
          exitCode: 0
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo frame compressed multicast\n    lo: 1000      10    0    0    0     0          0         0  1000      10    0    0    0     0          0         0',
          stderr: '',
          exitCode: 0
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'Current Battery Service state:\n  AC powered: false\n  USB powered: true\n  Wireless powered: false\n  Max charging current:\n  Max charging voltage:\n  Charge counter:\n  status: 2\n  health: 2\n  present: true\n  level: 85\n  scale: 100\n  voltage: 4300\n  temperature: 300\n  technology: Li-ion',
          stderr: '',
          exitCode: 0
        });

      const result = await advancedTools.getPerformanceMetrics.handler({});

      expect(result.success).toBe(true);
      expect(result.data.metrics.cpu.cores).toBe(2);
      expect(result.data.metrics.memory.total).toBe(4096000 * 1024);
      expect(result.data.metrics.disk.total).toBe(2048000 * 1024);
      expect(result.data.metrics.battery).toBeDefined();
      expect(result.data.metrics.battery?.level).toBe(85);
    });

    it('should handle missing battery information', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeShell
        .mockResolvedValue({ success: false, stdout: '', stderr: 'Command failed', exitCode: 1 });

      const result = await advancedTools.getPerformanceMetrics.handler({
        includeBattery: false
      });

      expect(result.success).toBe(true);
      expect(result.data.metrics.battery).toBeUndefined();
    });
  });

  describe('streamLogs', () => {
    it('should return log stream preview', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue({
        success: true,
        stdout: '01-01 12:00:00.000 1234 1234 I TestTag: Test message\n01-01 12:00:01.000 1235 1235 D AnotherTag: Another message',
        stderr: '',
        exitCode: 0
      });

      const result = await advancedTools.streamLogs.handler({
        level: 'I',
        duration: 30
      });

      expect(result.success).toBe(true);
      expect(result.data.logs).toHaveLength(2);
      expect(result.data.filter.level).toBe('I');
      expect(result.data.filter.duration).toBe(30);
    });
  });

  describe('manageWirelessConnection', () => {
    it('should list wireless connections', async () => {
      mockClient.getDevices.mockResolvedValue([
        {
          id: '192.168.1.100:5555',
          model: 'Test Device',
          product: 'test',
          device: 'test',
          transportId: '1',
          status: 'device'
        }
      ]);

      const result = await advancedTools.manageWirelessConnection.handler({
        action: 'list'
      });

      expect(result.success).toBe(true);
      expect(result.data.wirelessDevices).toBeDefined();
      expect(result.data.wirelessDevices).toHaveLength(1);
      expect(result.data.wirelessDevices![0].ipAddress).toBe('192.168.1.100');
      expect(result.data.wirelessDevices![0].connected).toBe(true);
    });

    it('should connect to wireless device', async () => {
      mockClient.connect.mockResolvedValue(true);

      const result = await advancedTools.manageWirelessConnection.handler({
        action: 'connect',
        host: '192.168.1.100',
        port: 5555
      });

      expect(mockClient.connect).toHaveBeenCalledWith('192.168.1.100', 5555);
      expect(result.success).toBe(true);
      expect(result.data.connected).toBe(true);
    });

    it('should disconnect from wireless device', async () => {
      mockClient.disconnect.mockResolvedValue(true);

      const result = await advancedTools.manageWirelessConnection.handler({
        action: 'disconnect',
        host: '192.168.1.100',
        port: 5555
      });

      expect(mockClient.disconnect).toHaveBeenCalledWith('192.168.1.100', 5555);
      expect(result.success).toBe(true);
      expect(result.data.disconnected).toBe(true);
    });

    it('should pair with wireless device', async () => {
      mockClient.executeCommand.mockResolvedValue({
        success: true,
        stdout: 'Successfully paired',
        stderr: '',
        exitCode: 0
      });

      const result = await advancedTools.manageWirelessConnection.handler({
        action: 'pair',
        host: '192.168.1.100',
        pairingPort: 4321,
        code: '123456'
      });

      expect(mockClient.executeCommand).toHaveBeenCalledWith('pair 192.168.1.100:4321 123456');
      expect(result.success).toBe(true);
      expect(result.data.paired).toBe(true);
    });
  });

  describe('streamFile', () => {
    it('should stream file content', async () => {
      const mockFileContent = 'Hello, World! This is a test file content.';
      const base64Content = Buffer.from(mockFileContent).toString('base64');

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeShell
        .mockResolvedValueOnce({
          success: true,
          stdout: '35',
          stderr: '',
          exitCode: 0
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: base64Content,
          stderr: '',
          exitCode: 0
        });

      const result = await advancedTools.streamFile.handler({
        path: '/sdcard/test.txt'
      });

      expect(result.success).toBe(true);
      expect(result.data.fileSize).toBe(35);
      expect(result.data.readLength).toBe(mockFileContent.length);
      expect(result.data.base64Content).toBe(base64Content);
      expect(result.data.content).toBe(mockFileContent.substring(0, 1000));
    });

    it('should handle file not found', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'No such file or directory',
        exitCode: 1
      });

      await expect(
        advancedTools.streamFile.handler({ path: '/sdcard/nonexistent.txt' })
      ).rejects.toThrow('File not found');
    });

    it('should handle offset beyond file size', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.executeShell.mockResolvedValue({
        success: true,
        stdout: '100',
        stderr: '',
        exitCode: 0
      });

      await expect(
        advancedTools.streamFile.handler({ path: '/sdcard/test.txt', offset: 150 })
      ).rejects.toThrow('Offset exceeds file size');
    });
  });
});