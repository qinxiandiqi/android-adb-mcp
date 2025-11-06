import { AdbClient } from '../adb/client';
import { validateDeviceId, validateShellCommand } from '../utils/validation';

const shellTools = {
  /**
   * Execute a shell command on the device
   */
  executeShell: {
    name: 'execute_shell',
    description: 'Execute a shell command on the Android device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to execute (only safe commands are allowed)'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['command']
    },
    handler: async (args: { command: string; deviceId?: string }) => {
      const command = validateShellCommand(args.command);
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.executeShell(command, deviceId);

      return {
        success: result.success,
        data: {
          command,
          deviceId,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Get system properties
   */
  getSystemProperties: {
    name: 'get_system_properties',
    description: 'Get Android system properties',
    inputSchema: {
      type: 'object' as const,
      properties: {
        property: {
          type: 'string',
          description: 'Specific property to get (optional, gets all if not provided)'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { property?: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const command = args.property ? `getprop ${args.property}` : 'getprop';
      const result = await client.executeShell(command, deviceId);

      if (!result.success) {
        throw new Error(`Failed to get system properties: ${result.stderr}`);
      }

      // Parse properties into key-value pairs
      const properties: Record<string, string> = {};
      const lines = result.stdout.split('\n');

      for (const line of lines) {
        const match = line.match(/^\[(.+?)\]: \[(.+?)\]$/);
        if (match) {
          properties[match[1]] = match[2];
        }
      }

      return {
        success: true,
        data: {
          deviceId,
          property: args.property,
          properties: args.property ? { [args.property]: properties[args.property] || '' } : properties
        }
      };
    }
  },

  /**
   * List running processes
   */
  listProcesses: {
    name: 'list_processes',
    description: 'List running processes on the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.executeShell('ps -A', deviceId);

      if (!result.success) {
        throw new Error(`Failed to list processes: ${result.stderr}`);
      }

      // Parse process list
      const lines = result.stdout.split('\n');
      const processes: any[] = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {continue;}

        const parts = line.split(/\s+/);
        if (parts.length >= 9) {
          processes.push({
            user: parts[0],
            pid: parseInt(parts[1]),
            ppid: parseInt(parts[2]),
            vsize: parts[3],
            rss: parts[4],
            wchan: parts[5],
            addr: parts[6],
            s: parts[7],
            name: parts.slice(8).join(' ')
          });
        }
      }

      return {
        success: true,
        data: {
          deviceId,
          processes,
          count: processes.length
        }
      };
    }
  },

  /**
   * Get device memory information
   */
  getMemoryInfo: {
    name: 'get_memory_info',
    description: 'Get memory usage information from the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.executeShell('cat /proc/meminfo', deviceId);

      if (!result.success) {
        throw new Error(`Failed to get memory info: ${result.stderr}`);
      }

      // Parse memory information
      const memoryInfo: Record<string, { value: number; unit: string }> = {};
      const lines = result.stdout.split('\n');

      for (const line of lines) {
        const match = line.match(/^([^:]+):\s*(\d+)\s*(\w+)?/);
        if (match) {
          memoryInfo[match[1]] = {
            value: parseInt(match[2]),
            unit: match[3] || 'kB'
          };
        }
      }

      return {
        success: true,
        data: {
          deviceId,
          memoryInfo
        }
      };
    }
  },

  /**
   * Get disk usage information
   */
  getDiskUsage: {
    name: 'get_disk_usage',
    description: 'Get disk usage information from the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Path to check (default: /)',
          default: '/'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { path?: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const path = args.path || '/';
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.executeShell(`df -h "${path}"`, deviceId);

      if (!result.success) {
        throw new Error(`Failed to get disk usage: ${result.stderr}`);
      }

      // Parse disk usage
      const lines = result.stdout.split('\n');
      const diskInfo: any[] = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {continue;}

        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          diskInfo.push({
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parts[4],
            mountPoint: parts[5]
          });
        }
      }

      return {
        success: true,
        data: {
          deviceId,
          path,
          diskInfo
        }
      };
    }
  }
};

export default shellTools;
