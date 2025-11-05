import appTools from '../../../src/tools/app-tools';
import { mockSpawn, createMockProcess, mockSuccessResult, mockAdbOutputs } from '../../mocks/adb-mocks-simple';

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('AppTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('installApp', () => {
    it('should install app successfully', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.installApp.handler({
        apkPath: '/path/to/app.apk'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        apkPath: '/path/to/app.apk',
        deviceId: undefined,
        stdout: 'Success',
        stderr: '',
        exitCode: 0
      });
    });

    it('should install app with device ID', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.installApp.handler({
        apkPath: '/path/to/app.apk',
        deviceId: 'emulator-5554'
      });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('emulator-5554');
    });

    it('should install app with options', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.installApp.handler({
        apkPath: '/path/to/app.apk',
        replace: true,
        test: true,
        grantPermissions: true
      });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('install -r -t -g'),
        { shell: true }
      );
    });

    it('should throw error when ADB is not available', async () => {
      const mockProcess = createMockProcess({
        success: false,
        stdout: '',
        stderr: 'adb: not found',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      await expect(appTools.installApp.handler({
        apkPath: '/path/to/app.apk'
      })).rejects.toThrow('ADB is not available');
    });

    it('should handle installation failure', async () => {
      const mockProcess = createMockProcess({
        success: false,
        stdout: '',
        stderr: 'Installation failed',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      // Mock isAvailable to return true
      mockSpawn.mockReturnValueOnce(createMockProcess(mockSuccessResult));
      mockSpawn.mockReturnValueOnce(mockProcess);

      await expect(appTools.installApp.handler({
        apkPath: '/path/to/app.apk'
      })).rejects.toThrow('Failed to install app');
    });
  });

  describe('uninstallApp', () => {
    it('should uninstall app successfully', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.uninstallApp.handler({
        packageName: 'com.example.app'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        packageName: 'com.example.app',
        deviceId: undefined,
        stdout: 'Success',
        stderr: '',
        exitCode: 0
      });
    });

    it('should uninstall app with device ID', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.uninstallApp.handler({
        packageName: 'com.example.app',
        deviceId: 'emulator-5554'
      });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('emulator-5554');
    });

    it('should uninstall app with keep data option', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.uninstallApp.handler({
        packageName: 'com.example.app',
        keepData: true
      });

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('uninstall -k'),
        { shell: true }
      );
    });

    it('should throw error when ADB is not available', async () => {
      const mockProcess = createMockProcess({
        success: false,
        stdout: '',
        stderr: 'adb: not found',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      await expect(appTools.uninstallApp.handler({
        packageName: 'com.example.app'
      })).rejects.toThrow('ADB is not available');
    });

    it('should handle uninstallation failure', async () => {
      const mockProcess = createMockProcess({
        success: false,
        stdout: '',
        stderr: 'Uninstallation failed',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      // Mock isAvailable to return true
      mockSpawn.mockReturnValueOnce(createMockProcess(mockSuccessResult));
      mockSpawn.mockReturnValueOnce(mockProcess);

      await expect(appTools.uninstallApp.handler({
        packageName: 'com.example.app'
      })).rejects.toThrow('Failed to uninstall app');
    });
  });

  describe('listApps', () => {
    it('should get list of installed apps', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: mockAdbOutputs.packages,
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.listApps.handler({});

      expect(result.success).toBe(true);
      expect(result.data.apps).toContain('com.example.app');
    });

    it('should get list of system apps', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: mockAdbOutputs.packages,
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.listApps.handler({
        filter: 'system'
      });

      expect(result.success).toBe(true);
      expect(result.data.filter).toBe('system');
    });

    it('should get apps with device ID', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: mockAdbOutputs.packages,
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.listApps.handler({
        deviceId: 'emulator-5554'
      });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('emulator-5554');
    });

    it('should handle package list failure', async () => {
      const mockProcess = createMockProcess({
        success: false,
        stdout: '',
        stderr: 'Failed to get packages',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      // Mock isAvailable to return true
      mockSpawn.mockReturnValueOnce(createMockProcess(mockSuccessResult));
      mockSpawn.mockReturnValueOnce(mockProcess);

      await expect(appTools.listApps.handler({}))
        .rejects.toThrow('Failed to list apps');
    });
  });

  describe('getAppInfo', () => {
    it('should get app information', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: 'versionCode=1\nversionName=1.0.0',
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.getAppInfo.handler({
        packageName: 'com.example.app'
      });

      expect(result.success).toBe(true);
      expect(result.data.appInfo.packageName).toBe('com.example.app');
      expect(result.data.appInfo).toEqual({
        packageName: 'com.example.app',
        versionCode: '1',
        versionName: '1.0.0'
      });
    });

    it('should get app info with device ID', async () => {
      const mockProcess = createMockProcess({
        success: true,
        stdout: 'versionCode=1\nversionName=1.0.0',
        stderr: '',
        exitCode: 0
      });
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.getAppInfo.handler({
        packageName: 'com.example.app',
        deviceId: 'emulator-5554'
      });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('emulator-5554');
    });

    it('should handle app info failure', async () => {
      const mockProcess = createMockProcess({
        success: false,
        stdout: '',
        stderr: 'Package not found',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      // Mock isAvailable to return true
      mockSpawn.mockReturnValueOnce(createMockProcess(mockSuccessResult));
      mockSpawn.mockReturnValueOnce(mockProcess);

      await expect(appTools.getAppInfo.handler({
        packageName: 'com.example.app'
      })).rejects.toThrow('Failed to get app info');
    });
  });

  describe('clearAppData', () => {
    it('should clear app data successfully', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.clearAppData.handler({
        packageName: 'com.example.app'
      });

      expect(result.success).toBe(true);
      expect(result.data.packageName).toBe('com.example.app');
    });

    it('should clear app data with device ID', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.clearAppData.handler({
        packageName: 'com.example.app',
        deviceId: 'emulator-5554'
      });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('emulator-5554');
    });

    it('should handle clear data failure', async () => {
      const mockProcess = createMockProcess({
        success: false,
        stdout: '',
        stderr: 'Failed to clear data',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      // Mock isAvailable to return true
      mockSpawn.mockReturnValueOnce(createMockProcess(mockSuccessResult));
      mockSpawn.mockReturnValueOnce(mockProcess);

      await expect(appTools.clearAppData.handler({
        packageName: 'com.example.app'
      })).rejects.toThrow('Failed to clear app data');
    });
  });

  describe('stopApp', () => {
    it('should stop app successfully', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.stopApp.handler({
        packageName: 'com.example.app'
      });

      expect(result.success).toBe(true);
      expect(result.data.packageName).toBe('com.example.app');
    });

    it('should stop app with device ID', async () => {
      const mockProcess = createMockProcess(mockSuccessResult);
      mockSpawn.mockReturnValue(mockProcess);

      const result = await appTools.stopApp.handler({
        packageName: 'com.example.app',
        deviceId: 'emulator-5554'
      });

      expect(result.success).toBe(true);
      expect(result.data.deviceId).toBe('emulator-5554');
    });

    it('should handle stop failure', async () => {
      const mockProcess = createMockProcess({
        success: false,
        stdout: '',
        stderr: 'Failed to stop app',
        exitCode: 1
      });
      mockSpawn.mockReturnValue(mockProcess);

      // Mock isAvailable to return true
      mockSpawn.mockReturnValueOnce(createMockProcess(mockSuccessResult));
      mockSpawn.mockReturnValueOnce(mockProcess);

      await expect(appTools.stopApp.handler({
        packageName: 'com.example.app'
      })).rejects.toThrow('Failed to stop app');
    });
  });

  describe('tool definitions', () => {
    it('should have correct tool definitions', () => {
      expect(appTools.installApp.name).toBe('install_app');
      expect(appTools.installApp.description).toBe('Install an APK file on the device');
      expect(appTools.uninstallApp.name).toBe('uninstall_app');
      expect(appTools.uninstallApp.description).toBe('Uninstall an application from the device');
      expect(appTools.listApps.name).toBe('list_apps');
      expect(appTools.listApps.description).toBe('List installed applications on device');
      expect(appTools.getAppInfo.name).toBe('get_app_info');
      expect(appTools.getAppInfo.description).toBe('Get detailed information about a specific application');
      expect(appTools.clearAppData.name).toBe('clear_app_data');
      expect(appTools.clearAppData.description).toBe('Clear application data and cache');
      expect(appTools.stopApp.name).toBe('stop_app');
      expect(appTools.stopApp.description).toBe('Stop an application on the device');
    });

    it('should have correct input schemas', () => {
      // Install app schema
      expect(appTools.installApp.inputSchema.properties.apkPath.type).toBe('string');
      expect(appTools.installApp.inputSchema.properties.apkPath.description).toBe('Path to APK file');
      expect(appTools.installApp.inputSchema.required).toContain('apkPath');

      // Uninstall app schema
      expect(appTools.uninstallApp.inputSchema.properties.packageName.type).toBe('string');
      expect(appTools.uninstallApp.inputSchema.properties.packageName.description).toBe('Package name of the app to uninstall');
      expect(appTools.uninstallApp.inputSchema.required).toContain('packageName');

      // Get installed apps schema
      expect(appTools.listApps.inputSchema.properties.filter.type).toBe('string');
      expect(appTools.listApps.inputSchema.properties.filter.description).toBe('Filter apps: "system", "user", "third-party" (optional)');
      expect(appTools.listApps.inputSchema.required).toEqual([]);

      // Get app info schema
      expect(appTools.getAppInfo.inputSchema.properties.packageName.type).toBe('string');
      expect(appTools.getAppInfo.inputSchema.properties.packageName.description).toBe('Package name of the app');
      expect(appTools.getAppInfo.inputSchema.required).toContain('packageName');

      // Clear app data schema
      expect(appTools.clearAppData.inputSchema.properties.packageName.type).toBe('string');
      expect(appTools.clearAppData.inputSchema.properties.packageName.description).toBe('Package name of the app');
      expect(appTools.clearAppData.inputSchema.required).toContain('packageName');

      // Stop app schema
      expect(appTools.stopApp.inputSchema.properties.packageName.type).toBe('string');
      expect(appTools.stopApp.inputSchema.properties.packageName.description).toBe('Package name of application');
      expect(appTools.stopApp.inputSchema.required).toContain('packageName');
    });

    it('should have correct default values', () => {
      expect(appTools.installApp.inputSchema.properties.replace.default).toBe(false);
      expect(appTools.installApp.inputSchema.properties.test.default).toBe(false);
      expect(appTools.installApp.inputSchema.properties.grantPermissions.default).toBe(false);
      expect(appTools.installApp.inputSchema.properties.allowDowngrade.default).toBe(false);
      expect(appTools.uninstallApp.inputSchema.properties.keepData.default).toBe(false);
    });
  });
});
