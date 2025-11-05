import deviceTools from '@/tools/device-tools';
import { AdbClient } from '@/adb/client';

// Mock the AdbClient
jest.mock('@/adb/client');
const MockedAdbClient = AdbClient as jest.MockedClass<typeof AdbClient>;

describe('DeviceTools', () => {
  let mockClient: jest.Mocked<AdbClient>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create mock client instance
    mockClient = new MockedAdbClient() as jest.Mocked<AdbClient>;
    
    // Mock the methods
    mockClient.isAvailable = jest.fn();
    mockClient.getDevices = jest.fn();
    mockClient.getDeviceInfo = jest.fn();
    mockClient.isDeviceConnected = jest.fn();
    mockClient.connect = jest.fn();
    mockClient.disconnect = jest.fn();
    mockClient.waitForDevice = jest.fn();
  });

  describe('listDevices', () => {
    it('should return list of connected devices', async () => {
      const mockDevices = [
        {
          id: 'emulator-5554',
          model: 'sdk_gphone_x86',
          product: 'sdk_gphone_x86',
          device: 'sdk_gphone_x86',
          transportId: '1',
          status: 'device' as const
        }
      ];

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.getDevices.mockResolvedValue(mockDevices);

      const result = await deviceTools.listDevices.handler();

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.getDevices).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.devices).toEqual(mockDevices);
      expect(result.data.count).toBe(1);
    });

    it('should throw error when ADB is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);

      await expect(deviceTools.listDevices.handler()).rejects.toThrow('ADB is not available');
    });

    it('should handle errors when getting devices', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.getDevices.mockRejectedValue(new Error('Failed to get devices'));

      await expect(deviceTools.listDevices.handler()).rejects.toThrow('Failed to get devices');
    });
  });

  describe('getDeviceInfo', () => {
    it('should return device information for valid device', async () => {
      const deviceId = 'emulator-5554';
      const mockDevice = {
        id: deviceId,
        model: 'sdk_gphone_x86',
        product: 'sdk_gphone_x86',
        device: 'sdk_gphone_x86',
        transportId: '1',
        status: 'device' as const
      };
      const mockProperties = {
        'ro.product.model': 'sdk_gphone_x86',
        'ro.product.manufacturer': 'Google',
        'ro.build.version.release': '13',
        'ro.build.version.sdk': '33'
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.getDeviceInfo.mockResolvedValue(mockProperties);
      mockClient.getDevices.mockResolvedValue([mockDevice]);

      const result = await deviceTools.getDeviceInfo.handler({ deviceId });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.isDeviceConnected).toHaveBeenCalledWith(deviceId);
      expect(mockClient.getDeviceInfo).toHaveBeenCalledWith(deviceId);
      expect(result.success).toBe(true);
      expect(result.data.device).toEqual(mockDevice);
      expect(result.data.properties).toEqual(mockProperties);
    });

    it('should throw error when ADB is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);

      await expect(deviceTools.getDeviceInfo.handler({ deviceId: 'test' })).rejects.toThrow('ADB is not available');
    });

    it('should throw error when device is not connected', async () => {
      const deviceId = 'nonexistent';
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(false);

      await expect(deviceTools.getDeviceInfo.handler({ deviceId })).rejects.toThrow('Device nonexistent is not connected or not authorized');
    });
  });

  describe('connectDevice', () => {
    it('should connect to device via TCP/IP', async () => {
      const host = '192.168.1.100';
      const port = 5555;

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.connect.mockResolvedValue(true);

      const result = await deviceTools.connectDevice.handler({ host, port });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.connect).toHaveBeenCalledWith(host, port);
      expect(result.success).toBe(true);
      expect(result.data.host).toBe(host);
      expect(result.data.port).toBe(port);
      expect(result.data.connected).toBe(true);
    });

    it('should use default port when not specified', async () => {
      const host = '192.168.1.100';

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.connect.mockResolvedValue(true);

      await deviceTools.connectDevice.handler({ host });

      expect(mockClient.connect).toHaveBeenCalledWith(host, 5555);
    });

    it('should throw error when ADB is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);

      await expect(deviceTools.connectDevice.handler({ host: '192.168.1.100' })).rejects.toThrow('ADB is not available');
    });

    it('should handle connection failure', async () => {
      const host = '192.168.1.100';

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.connect.mockResolvedValue(false);

      const result = await deviceTools.connectDevice.handler({ host });

      expect(result.success).toBe(false);
      expect(result.data.connected).toBe(false);
    });
  });

  describe('disconnectDevice', () => {
    it('should disconnect from specific device', async () => {
      const host = '192.168.1.100';
      const port = 5555;

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.disconnect.mockResolvedValue(true);

      const result = await deviceTools.disconnectDevice.handler({ host, port });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.disconnect).toHaveBeenCalledWith(host, port);
      expect(result.success).toBe(true);
      expect(result.data.host).toBe(host);
      expect(result.data.port).toBe(port);
      expect(result.data.disconnected).toBe(true);
    });

    it('should disconnect from all devices when no host specified', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.disconnect.mockResolvedValue(true);

      const result = await deviceTools.disconnectDevice.handler({});

      expect(mockClient.disconnect).toHaveBeenCalledWith(undefined, undefined);
      expect(result.success).toBe(true);
      expect(result.data.disconnected).toBe(true);
    });

    it('should throw error when ADB is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);

      await expect(deviceTools.disconnectDevice.handler({})).rejects.toThrow('ADB is not available');
    });
  });

  describe('waitForDevice', () => {
    it('should wait for specific device', async () => {
      const deviceId = 'emulator-5554';
      const timeout = 30;

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.waitForDevice.mockResolvedValue(true);

      const result = await deviceTools.waitForDevice.handler({ deviceId, timeout });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.waitForDevice).toHaveBeenCalledWith(deviceId, 30000);
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.timeout).toBe(timeout);
      expect(result.data.ready).toBe(true);
    });

    it('should wait for any device when no deviceId specified', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.waitForDevice.mockResolvedValue(true);

      const result = await deviceTools.waitForDevice.handler({});

      expect(mockClient.waitForDevice).toHaveBeenCalledWith(undefined, 30000);
      expect(result.success).toBe(true);
      expect(result.data.ready).toBe(true);
    });

    it('should use default timeout when not specified', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.waitForDevice.mockResolvedValue(true);

      await deviceTools.waitForDevice.handler({});

      expect(mockClient.waitForDevice).toHaveBeenCalledWith(undefined, 30000);
    });

    it('should throw error when ADB is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);

      await expect(deviceTools.waitForDevice.handler({})).rejects.toThrow('ADB is not available');
    });

    it('should handle timeout', async () => {
      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.waitForDevice.mockResolvedValue(false);

      const result = await deviceTools.waitForDevice.handler({ timeout: 10 });

      expect(result.success).toBe(false);
      expect(result.data.ready).toBe(false);
    });
  });

  describe('checkDeviceStatus', () => {
    it('should return device status for connected device', async () => {
      const deviceId = 'emulator-5554';
      const mockDevice = {
        id: deviceId,
        model: 'sdk_gphone_x86',
        product: 'sdk_gphone_x86',
        device: 'sdk_gphone_x86',
        transportId: '1',
        status: 'device' as const
      };

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(true);
      mockClient.getDevices.mockResolvedValue([mockDevice]);

      const result = await deviceTools.checkDeviceStatus.handler({ deviceId });

      expect(mockClient.isAvailable).toHaveBeenCalled();
      expect(mockClient.isDeviceConnected).toHaveBeenCalledWith(deviceId);
      expect(mockClient.getDevices).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe(deviceId);
      expect(result.data.connected).toBe(true);
      expect(result.data.status).toBe('device');
      expect(result.data.device).toEqual(mockDevice);
    });

    it('should return status for disconnected device', async () => {
      const deviceId = 'nonexistent';

      mockClient.isAvailable.mockResolvedValue(true);
      mockClient.isDeviceConnected.mockResolvedValue(false);
      mockClient.getDevices.mockResolvedValue([]);

      const result = await deviceTools.checkDeviceStatus.handler({ deviceId });

      expect(result.success).toBe(true);
      expect(result.data.connected).toBe(false);
      expect(result.data.status).toBe('missing');
      expect(result.data.device).toBeUndefined();
    });

    it('should throw error when ADB is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);

      await expect(deviceTools.checkDeviceStatus.handler({ deviceId: 'test' })).rejects.toThrow('ADB is not available');
    });
  });

  describe('tool definitions', () => {
    it('should have correct tool definitions', () => {
      expect(deviceTools.listDevices.name).toBe('list_devices');
      expect(deviceTools.listDevices.description).toBe('List all connected Android devices');
      expect(deviceTools.getDeviceInfo.name).toBe('get_device_info');
      expect(deviceTools.getDeviceInfo.description).toBe('Get detailed information about a specific Android device');
      expect(deviceTools.connectDevice.name).toBe('connect_device');
      expect(deviceTools.connectDevice.description).toBe('Connect to an Android device via TCP/IP');
      expect(deviceTools.disconnectDevice.name).toBe('disconnect_device');
      expect(deviceTools.disconnectDevice.description).toBe('Disconnect from an Android device');
      expect(deviceTools.waitForDevice.name).toBe('wait_for_device');
      expect(deviceTools.waitForDevice.description).toBe('Wait for a device to be connected and ready');
      expect(deviceTools.checkDeviceStatus.name).toBe('check_device_status');
      expect(deviceTools.checkDeviceStatus.description).toBe('Check if a device is connected and ready');
    });

    it('should have correct input schemas', () => {
      expect(deviceTools.getDeviceInfo.inputSchema.required).toContain('deviceId');
      expect(deviceTools.connectDevice.inputSchema.required).toContain('host');
      expect(deviceTools.disconnectDevice.inputSchema.required).toEqual([]);
      expect(deviceTools.waitForDevice.inputSchema.required).toEqual([]);
      expect(deviceTools.checkDeviceStatus.inputSchema.required).toContain('deviceId');
    });
  });
});
