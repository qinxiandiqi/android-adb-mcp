import { AdbClient } from '../adb/client';
import { validateDeviceId, validatePackageName, validateFilePath } from '../utils/validation';
import { AppInfo } from '../adb/types';

const appTools = {
  /**
   * List installed applications
   */
  listApps: {
    name: 'list_apps',
    description: 'List installed applications on the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'string',
          description: 'Filter apps: "system", "user", "third-party" (optional)',
          enum: ['system', 'user', 'third-party']
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { filter?: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      let command = 'pm list packages -f';
      
      if (args.filter === 'system') {
        command += ' -s';
      } else if (args.filter === 'user') {
        command += ' -u';
      } else if (args.filter === 'third-party') {
        command += ' -3';
      }

      const result = await client.executeShell(command, deviceId);
      
      if (!result.success) {
        throw new Error(`Failed to list apps: ${result.stderr}`);
      }

      // Parse package list
      const lines = result.stdout.split('\n');
      const apps: AppInfo[] = [];

      for (const line of lines) {
        const match = line.match(/^package:(.+?)=(.+)$/);
        if (match) {
          const packageName = match[2];
          
          apps.push({
            packageName,
            // Additional info would require more commands
          });
        }
      }

      return {
        success: true,
        data: {
          deviceId,
          filter: args.filter,
          apps,
          count: apps.length
        }
      };
    }
  },

  /**
   * Get application information
   */
  getAppInfo: {
    name: 'get_app_info',
    description: 'Get detailed information about a specific application',
    inputSchema: {
      type: 'object' as const,
      properties: {
        packageName: {
          type: 'string',
          description: 'Package name of the application'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['packageName']
    },
    handler: async (args: { packageName: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const packageName = validatePackageName(args.packageName);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      // Get package info
      const dumpsysResult = await client.executeShell(`dumpsys package ${packageName}`, deviceId);
      
      if (!dumpsysResult.success) {
        throw new Error(`Failed to get app info: ${dumpsysResult.stderr}`);
      }

      const appInfo: AppInfo = {
        packageName
      };

      // Parse dumpsys output for version info
      const versionMatch = dumpsysResult.stdout.match(/versionName=(.+)/);
      if (versionMatch) {
        appInfo.versionName = versionMatch[1];
      }

      const versionCodeMatch = dumpsysResult.stdout.match(/versionCode=(.+)/);
      if (versionCodeMatch) {
        appInfo.versionCode = versionCodeMatch[1];
      }

      // Parse install times
      const installTimeMatch = dumpsysResult.stdout.match(/firstInstallTime=(.+)/);
      if (installTimeMatch) {
        appInfo.installTime = installTimeMatch[1];
      }

      const updateTimeMatch = dumpsysResult.stdout.match(/lastUpdateTime=(.+)/);
      if (updateTimeMatch) {
        appInfo.updateTime = updateTimeMatch[1];
      }

      // Get APK path
      const apkPathMatch = dumpsysResult.stdout.match(/path:\s*(.+)$/m);
      if (apkPathMatch) {
        // Could get more info from APK if needed
      }

      return {
        success: true,
        data: {
          deviceId,
          appInfo,
          rawOutput: dumpsysResult.stdout
        }
      };
    }
  },

  /**
   * Install an APK file
   */
  installApp: {
    name: 'install_app',
    description: 'Install an APK file on the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        apkPath: {
          type: 'string',
          description: 'Local path to the APK file'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        },
        replace: {
          type: 'boolean',
          description: 'Replace existing app (default: false)',
          default: false
        },
        test: {
          type: 'boolean',
          description: 'Allow test APKs (default: false)',
          default: false
        },
        grantPermissions: {
          type: 'boolean',
          description: 'Grant all permissions (default: false)',
          default: false
        },
        allowDowngrade: {
          type: 'boolean',
          description: 'Allow downgrade (default: false)',
          default: false
        }
      },
      required: ['apkPath']
    },
    handler: async (args: { 
      apkPath: string; 
      deviceId?: string; 
      replace?: boolean; 
      test?: boolean; 
      grantPermissions?: boolean; 
      allowDowngrade?: boolean; 
    }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const apkPath = validateFilePath(args.apkPath);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.installApk(apkPath, deviceId, {
        replace: args.replace,
        test: args.test,
        grantPermissions: args.grantPermissions,
        allowDowngrade: args.allowDowngrade
      });
      
      return {
        success: result.success,
        data: {
          deviceId,
          apkPath,
          options: {
            replace: args.replace,
            test: args.test,
            grantPermissions: args.grantPermissions,
            allowDowngrade: args.allowDowngrade
          },
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Uninstall an application
   */
  uninstallApp: {
    name: 'uninstall_app',
    description: 'Uninstall an application from the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        packageName: {
          type: 'string',
          description: 'Package name of the application to uninstall'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        },
        keepData: {
          type: 'boolean',
          description: 'Keep app data and cache (default: false)',
          default: false
        }
      },
      required: ['packageName']
    },
    handler: async (args: { packageName: string; deviceId?: string; keepData?: boolean }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const packageName = validatePackageName(args.packageName);
      const keepData = args.keepData || false;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.uninstallApp(packageName, deviceId, keepData);
      
      return {
        success: result.success,
        data: {
          deviceId,
          packageName,
          keepData,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Start an application
   */
  startApp: {
    name: 'start_app',
    description: 'Start an application on the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        packageName: {
          type: 'string',
          description: 'Package name of the application'
        },
        activity: {
          type: 'string',
          description: 'Activity name (optional, uses main activity if not provided)'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['packageName']
    },
    handler: async (args: { packageName: string; activity?: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const packageName = validatePackageName(args.packageName);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      let command = `am start ${packageName}`;
      if (args.activity) {
        command += `/${args.activity}`;
      } else {
        command += '/.MainActivity';
      }

      const result = await client.executeShell(command, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          packageName,
          activity: args.activity,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Stop an application
   */
  stopApp: {
    name: 'stop_app',
    description: 'Stop an application on the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        packageName: {
          type: 'string',
          description: 'Package name of the application'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['packageName']
    },
    handler: async (args: { packageName: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const packageName = validatePackageName(args.packageName);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const command = `am force-stop ${packageName}`;
      const result = await client.executeShell(command, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          packageName,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Clear application data
   */
  clearAppData: {
    name: 'clear_app_data',
    description: 'Clear application data and cache',
    inputSchema: {
      type: 'object' as const,
      properties: {
        packageName: {
          type: 'string',
          description: 'Package name of the application'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['packageName']
    },
    handler: async (args: { packageName: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const packageName = validatePackageName(args.packageName);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const command = `pm clear ${packageName}`;
      const result = await client.executeShell(command, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          packageName,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  }
};

export default appTools;
