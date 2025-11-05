import { AdbClient } from '../../../src/adb/client';
import { mockSpawn, createMockProcess, mockSuccessResult, mockFailureResult, mockAdbOutputs } from '../../mocks/adb-mocks';

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('AdbClient', () => {
  let adbClient: AdbClient;

  beforeEach(() => {
    adbClient = new AdbClient();
    jest.clearAllMocks();
  });

  describe('executeCommand', () => {
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

    it('should handle device-specific commands', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      await adbClient.executeCommand('shell getprop', { deviceId: 'emulator-5554' });

      expect(mockSpawn).toHaveBeenCalledWith('adb -s emulator-5554 shell getprop', { shell: true });
    });
  });

  describe('isAvailable', () => {
    it('should return true when ADB is available', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.isAvailable();

      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb version', { shell: true });
    });

    it('should return false when ADB is not available', async () => {
      const mockProcess = createMockProcess(mockFailureResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getDevices', () => {
    it('should return list of devices', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: mockAdbOutputs.devices,
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.getDevices();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(mockSpawn).toHaveBeenCalledWith('adb devices -l', { shell: true });
    });
  });

  describe('getDeviceInfo', () => {
    it('should get device information', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: mockAdbOutputs.deviceInfo,
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.getDeviceInfo('emulator-5554');

      expect(typeof result).toBe('object');
      expect(mockSpawn).toHaveBeenCalledWith('adb -s emulator-5554 shell getprop', { shell: true });
    });
  });

  describe('isDeviceConnected', () => {
    it('should return true for connected device', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: mockAdbOutputs.devices,
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.isDeviceConnected('emulator-5554');

      expect(result).toBe(true);
    });

    it('should return false for disconnected device', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: 'List of devices attached',
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.isDeviceConnected('emulator-5554');

      expect(result).toBe(false);
    });
  });

  describe('executeShell', () => {
    it('should execute shell command', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: mockAdbOutputs.shellOutput,
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.executeShell('getprop ro.product.model');

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb shell "getprop ro.product.model"', { shell: true });
    });

    it('should execute shell command on specific device', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: mockAdbOutputs.shellOutput,
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.executeShell('getprop ro.product.model', 'emulator-5554');

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb -s emulator-5554 shell "getprop ro.product.model"', { shell: true });
    });
  });

  describe('pushFile', () => {
    it('should push file to device', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.pushFile('/local/path', '/device/path');

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb push "/local/path" "/device/path"', { shell: true });
    });
  });

  describe('pullFile', () => {
    it('should pull file from device', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.pullFile('/device/path', '/local/path');

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb pull "/device/path" "/local/path"', { shell: true });
    });
  });

  describe('installApk', () => {
    it('should install APK', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.installApk('/path/to/app.apk');

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb install "/path/to/app.apk"', { shell: true });
    });

    it('should install APK with options', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.installApk('/path/to/app.apk', undefined, {
        replace: true,
        test: true,
        grantPermissions: true
      });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb install -r -t -g "/path/to/app.apk"', { shell: true });
    });
  });

  describe('uninstallApp', () => {
    it('should uninstall app', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.uninstallApp('com.example.app');

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb uninstall com.example.app', { shell: true });
    });

    it('should uninstall app with keep data option', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.uninstallApp('com.example.app', undefined, true);

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb uninstall -k com.example.app', { shell: true });
    });
  });

  describe('connect', () => {
    it('should connect to device', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.connect('192.168.1.100', 5555);

      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb connect 192.168.1.100:5555', { shell: true });
    });
  });

  describe('disconnect', () => {
    it('should disconnect from device', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await adbClient.disconnect('192.168.1.100', 5555);

      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('adb disconnect 192.168.1.100:5555', { shell: true });
    });
  });
});
