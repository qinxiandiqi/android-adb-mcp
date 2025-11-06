import { AdbClient } from '../adb/client';
import { validateDeviceId, validateLogFilter } from '../utils/validation';
import { LogEntry } from '../adb/types';

const logTools = {
  /**
   * Get logcat logs
   */
  getLogs: {
    name: 'get_logs',
    description: 'Get logcat logs from the device with optional filtering',
    inputSchema: {
      type: 'object' as const,
      properties: {
        level: {
          type: 'string',
          description: 'Log level: V, D, I, W, E (optional)',
          enum: ['V', 'D', 'I', 'W', 'E']
        },
        tag: {
          type: 'string',
          description: 'Filter by log tag (optional)',
          maxLength: 100
        },
        packageName: {
          type: 'string',
          description: 'Filter by package name (optional)',
          maxLength: 100
        },
        since: {
          type: 'string',
          description: 'Show logs since specified time (e.g., "2023-01-01 00:00:00")'
        },
        count: {
          type: 'number',
          description: 'Number of lines to retrieve (max: 1000, default: 100)',
          minimum: 1,
          maximum: 1000,
          default: 100
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { 
      level?: string; 
      tag?: string; 
      packageName?: string; 
      since?: string; 
      count?: number; 
      deviceId?: string; 
    }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const filter = validateLogFilter({
        level: args.level as any,
        tag: args.tag,
        packageName: args.packageName,
        since: args.since,
        count: args.count
      });
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      // Build logcat command
      let command = 'logcat -d'; // -d for dump and exit
      
      if (filter.level) {
        command += ` *:${filter.level}`;
      }
      
      if (filter.tag) {
        command += ` ${filter.tag}:*`;
      }
      
      if (filter.packageName) {
        command += ` --pid=$(pidof ${filter.packageName})`;
      }
      
      if (filter.since) {
        command += ` -t "${filter.since}"`;
      }

      const result = await client.executeShell(command, deviceId);
      
      if (!result.success) {
        throw new Error(`Failed to get logs: ${result.stderr}`);
      }

      // Parse log entries
      const lines = result.stdout.split('\n');
      const logs: LogEntry[] = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Parse logcat format: mm-dd hh:mm:ss.sss pid tid level tag: message
        const match = line.match(/^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWE])\s+([^:]+):\s*(.*)$/);
        
        if (match) {
          logs.push({
            timestamp: match[1],
            level: match[4],
            tag: match[5].trim(),
            message: match[6],
            pid: parseInt(match[2]),
            tid: parseInt(match[3])
          });
        }
      }

      // Limit results if count is specified
      const limitedLogs = filter.count ? logs.slice(-filter.count) : logs;

      return {
        success: true,
        data: {
          deviceId,
          filter,
          logs: limitedLogs,
          count: limitedLogs.length,
          totalLines: lines.length
        }
      };
    }
  },

  /**
   * Clear logcat buffer
   */
  clearLogs: {
    name: 'clear_logs',
    description: 'Clear the logcat buffer',
    inputSchema: {
      type: 'object' as const,
      properties: {
        buffer: {
          type: 'string',
          description: 'Buffer to clear: main, system, radio, events, or all (default: all)',
          enum: ['main', 'system', 'radio', 'events', 'all'],
          default: 'all'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { buffer?: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const buffer = args.buffer || 'all';
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const command = buffer === 'all' ? 'logcat -c' : `logcat -b ${buffer} -c`;
      const result = await client.executeShell(command, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          buffer,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Get crash logs
   */
  getCrashLogs: {
    name: 'get_crash_logs',
    description: 'Get application crash logs from dropbox',
    inputSchema: {
      type: 'object' as const,
      properties: {
        packageName: {
          type: 'string',
          description: 'Filter by package name (optional)',
          maxLength: 100
        },
        count: {
          type: 'number',
          description: 'Number of crash logs to retrieve (max: 50, default: 10)',
          minimum: 1,
          maximum: 50,
          default: 10
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { packageName?: string; count?: number; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const count = args.count || 10;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      // Get dropbox crash logs
      let command = 'dumpsys dropbox --proto data_app_crash';
      
      if (args.packageName) {
        command += ` | grep ${args.packageName}`;
      }

      const result = await client.executeShell(command, deviceId);
      
      if (!result.success) {
        throw new Error(`Failed to get crash logs: ${result.stderr}`);
      }

      // Parse crash logs (simplified parsing)
      const lines = result.stdout.split('\n');
      const crashLogs: any[] = [];
      
      let currentCrash: any = null;
      
      for (const line of lines) {
        if (line.includes('data_app_crash')) {
          if (currentCrash) {
            crashLogs.push(currentCrash);
          }
          currentCrash = {
            timestamp: line.trim(),
            details: []
          };
        } else if (currentCrash && line.trim()) {
          currentCrash.details.push(line.trim());
        }
      }
      
      if (currentCrash) {
        crashLogs.push(currentCrash);
      }

      // Limit results
      const limitedCrashLogs = crashLogs.slice(-count);

      return {
        success: true,
        data: {
          deviceId,
          packageName: args.packageName,
          crashLogs: limitedCrashLogs,
          count: limitedCrashLogs.length
        }
      };
    }
  },

  /**
   * Get ANR (Application Not Responding) logs
   */
  getAnrLogs: {
    name: 'get_anr_logs',
    description: 'Get ANR (Application Not Responding) logs from dropbox',
    inputSchema: {
      type: 'object' as const,
      properties: {
        packageName: {
          type: 'string',
          description: 'Filter by package name (optional)',
          maxLength: 100
        },
        count: {
          type: 'number',
          description: 'Number of ANR logs to retrieve (max: 50, default: 10)',
          minimum: 1,
          maximum: 50,
          default: 10
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { packageName?: string; count?: number; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const count = args.count || 10;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      // Get dropbox ANR logs
      let command = 'dumpsys dropbox --proto data_app_anr';
      
      if (args.packageName) {
        command += ` | grep ${args.packageName}`;
      }

      const result = await client.executeShell(command, deviceId);
      
      if (!result.success) {
        throw new Error(`Failed to get ANR logs: ${result.stderr}`);
      }

      // Parse ANR logs (simplified parsing)
      const lines = result.stdout.split('\n');
      const anrLogs: any[] = [];
      
      let currentAnr: any = null;
      
      for (const line of lines) {
        if (line.includes('data_app_anr')) {
          if (currentAnr) {
            anrLogs.push(currentAnr);
          }
          currentAnr = {
            timestamp: line.trim(),
            details: []
          };
        } else if (currentAnr && line.trim()) {
          currentAnr.details.push(line.trim());
        }
      }
      
      if (currentAnr) {
        anrLogs.push(currentAnr);
      }

      // Limit results
      const limitedAnrLogs = anrLogs.slice(-count);

      return {
        success: true,
        data: {
          deviceId,
          packageName: args.packageName,
          anrLogs: limitedAnrLogs,
          count: limitedAnrLogs.length
        }
      };
    }
  },

  /**
   * Get kernel logs
   */
  getKernelLogs: {
    name: 'get_kernel_logs',
    description: 'Get kernel logs from the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        count: {
          type: 'number',
          description: 'Number of lines to retrieve (max: 1000, default: 100)',
          minimum: 1,
          maximum: 1000,
          default: 100
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { count?: number; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const count = args.count || 100;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const command = `dmesg | tail -n ${count}`;
      const result = await client.executeShell(command, deviceId);
      
      if (!result.success) {
        throw new Error(`Failed to get kernel logs: ${result.stderr}`);
      }

      const lines = result.stdout.split('\n').filter(line => line.trim());

      return {
        success: true,
        data: {
          deviceId,
          kernelLogs: lines,
          count: lines.length
        }
      };
    }
  }
};

export default logTools;
