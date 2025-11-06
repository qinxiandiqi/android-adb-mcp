import { AdbClient } from '../adb/client';
import { validateDeviceId, validateFilePath, validateShellCommand } from '../utils/validation';
// import { EventEmitter } from 'eventemitter3'; // Reserved for future streaming features

// Batch command execution
interface BatchCommand {
  command: string;
  description?: string;
  timeout?: number;
}

interface BatchExecutionResult {
  command: string;
  description?: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

// Performance monitoring data
interface PerformanceMetrics {
  cpu: {
    usage: number;
    cores: number;
    frequency: string;
  };
  memory: {
    total: number;
    available: number;
    used: number;
    percentage: number;
  };
  disk: {
    total: number;
    available: number;
    used: number;
    percentage: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  battery?: {
    level: number;
    temperature: number;
    status: string;
  };
  timestamp: string;
}

// Wireless connection info
interface WirelessConnection {
  deviceId: string;
  ipAddress: string;
  port: number;
  paired: boolean;
  connected: boolean;
  lastSeen: string;
}

const advancedTools = {
  /**
   * Execute multiple commands in batch
   */
  executeBatch: {
    name: 'execute_batch',
    description: 'Execute multiple ADB commands in sequence',
    inputSchema: {
      type: 'object' as const,
      properties: {
        commands: {
          type: 'array',
          description: 'Array of commands to execute',
          items: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command to execute' },
              description: { type: 'string', description: 'Optional description' },
              timeout: { type: 'number', description: 'Timeout in milliseconds' }
            },
            required: ['command']
          }
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        },
        stopOnError: {
          type: 'boolean',
          description: 'Stop execution on first error (default: false)',
          default: false
        }
      },
      required: ['commands']
    },
    handler: async (args: {
      commands: BatchCommand[];
      deviceId?: string;
      stopOnError?: boolean;
    }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const stopOnError = args.stopOnError || false;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const results: BatchExecutionResult[] = [];
      const startTime = Date.now();

      for (const batchCommand of args.commands) {
        const commandStartTime = Date.now();

        try {
          // Validate safety for shell commands
          if (batchCommand.command.startsWith('shell ')) {
            const shellCommand = batchCommand.command.substring(6);
            validateShellCommand(shellCommand);
          }

          const result = await client.executeCommand(batchCommand.command, {
            deviceId,
            timeout: batchCommand.timeout || 30000
          });

          const executionResult: BatchExecutionResult = {
            command: batchCommand.command,
            description: batchCommand.description,
            success: result.success,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            executionTime: Date.now() - commandStartTime
          };

          results.push(executionResult);

          if (!result.success && stopOnError) {
            break;
          }
        } catch (error) {
          const executionResult: BatchExecutionResult = {
            command: batchCommand.command,
            description: batchCommand.description,
            success: false,
            stdout: '',
            stderr: error instanceof Error ? error.message : 'Unknown error',
            exitCode: -1,
            executionTime: Date.now() - commandStartTime
          };

          results.push(executionResult);

          if (stopOnError) {
            break;
          }
        }
      }

      const totalExecutionTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;

      return {
        success: true,
        data: {
          deviceId,
          totalCommands: results.length,
          successCount,
          failureCount: results.length - successCount,
          totalExecutionTime,
          results
        }
      };
    }
  },

  /**
   * Get device performance metrics
   */
  getPerformanceMetrics: {
    name: 'get_performance_metrics',
    description: 'Get comprehensive performance metrics from the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        },
        includeBattery: {
          type: 'boolean',
          description: 'Include battery information (default: true)',
          default: true
        }
      },
      required: []
    },
    handler: async (args: { deviceId?: string; includeBattery?: boolean }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const includeBattery = args.includeBattery !== false;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const metrics: PerformanceMetrics = {
        cpu: { usage: 0, cores: 0, frequency: '0 MHz' },
        memory: { total: 0, available: 0, used: 0, percentage: 0 },
        disk: { total: 0, available: 0, used: 0, percentage: 0 },
        network: { rx: 0, tx: 0 },
        timestamp: new Date().toISOString()
      };

      // Get CPU information
      try {
        const cpuInfo = await client.executeShell('cat /proc/cpuinfo', deviceId);
        if (cpuInfo.success) {
          const lines = cpuInfo.stdout.split('\n');
          let coreCount = 0;
          let maxFreq = '0 MHz';

          for (const line of lines) {
            if (line.includes('processor')) {
              coreCount++;
            }
            if (line.includes('cpu MHz')) {
              const freq = line.split(':')[1]?.trim();
              if (freq && parseInt(freq) > parseInt(maxFreq)) {
                maxFreq = `${Math.round(parseInt(freq))} MHz`;
              }
            }
          }
          metrics.cpu.cores = coreCount;
          metrics.cpu.frequency = maxFreq;
        }

        // Get CPU usage (simplified)
        const cpuStat = await client.executeShell('cat /proc/stat', deviceId);
        if (cpuStat.success) {
          const firstLine = cpuStat.stdout.split('\n')[0];
          if (firstLine.startsWith('cpu ')) {
            const values = firstLine.split(/\s+/).slice(1);
            const idle = parseInt(values[3]);
            const total = values.reduce((sum, val) => sum + parseInt(val), 0);
            metrics.cpu.usage = Math.round(((total - idle) / total) * 100);
          }
        }
      } catch (error) {
        console.warn('Failed to get CPU metrics:', error);
      }

      // Get memory information
      try {
        const memInfo = await client.executeShell('cat /proc/meminfo', deviceId);
        if (memInfo.success) {
          const lines = memInfo.stdout.split('\n');
          const memData: Record<string, number> = {};

          for (const line of lines) {
            const match = line.match(/^([^:]+):\s*(\d+)\s*kB/);
            if (match) {
              memData[match[1]] = parseInt(match[2]) * 1024; // Convert to bytes
            }
          }

          metrics.memory.total = memData['MemTotal'] || 0;
          metrics.memory.available = memData['MemAvailable'] || 0;
          metrics.memory.used = metrics.memory.total - metrics.memory.available;
          metrics.memory.percentage = Math.round((metrics.memory.used / metrics.memory.total) * 100);
        }
      } catch (error) {
        console.warn('Failed to get memory metrics:', error);
      }

      // Get disk information
      try {
        const diskInfo = await client.executeShell('df /data', deviceId);
        if (diskInfo.success) {
          const lines = diskInfo.stdout.split('\n');
          if (lines.length > 1) {
            const parts = lines[1].split(/\s+/);
            if (parts.length >= 4) {
              metrics.disk.total = parseInt(parts[1]) * 1024; // Convert to bytes
              metrics.disk.used = parseInt(parts[2]) * 1024;
              metrics.disk.available = parseInt(parts[3]) * 1024;
              metrics.disk.percentage = Math.round((metrics.disk.used / metrics.disk.total) * 100);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to get disk metrics:', error);
      }

      // Get network information
      try {
        const networkStat = await client.executeShell('cat /proc/net/dev', deviceId);
        if (networkStat.success) {
          const lines = networkStat.stdout.split('\n');
          let totalRx = 0;
          let totalTx = 0;

          for (let i = 2; i < lines.length; i++) { // Skip header lines
            const parts = lines[i].trim().split(/\s+/);
            if (parts.length > 9) {
              totalRx += parseInt(parts[1]);
              totalTx += parseInt(parts[9]);
            }
          }

          metrics.network.rx = totalRx;
          metrics.network.tx = totalTx;
        }
      } catch (error) {
        console.warn('Failed to get network metrics:', error);
      }

      // Get battery information
      if (includeBattery) {
        try {
          const batteryInfo = await client.executeShell('dumpsys battery', deviceId);
          if (batteryInfo.success) {
            const lines = batteryInfo.stdout.split('\n');
            const batteryData: any = {};

            for (const line of lines) {
              if (line.includes('level:')) {
                batteryData.level = parseInt(line.split(':')[1]?.trim() || '0');
              }
              if (line.includes('temperature:')) {
                batteryData.temperature = parseInt(line.split(':')[1]?.trim() || '0') / 10;
              }
              if (line.includes('status:')) {
                batteryData.status = line.split(':')[1]?.trim() || 'Unknown';
              }
            }

            if (batteryData.level !== undefined) {
              metrics.battery = {
                level: batteryData.level,
                temperature: batteryData.temperature || 0,
                status: batteryData.status || 'Unknown'
              };
            }
          }
        } catch (error) {
          console.warn('Failed to get battery metrics:', error);
        }
      }

      return {
        success: true,
        data: {
          deviceId,
          metrics,
          timestamp: new Date().toISOString()
        }
      };
    }
  },

  /**
   * Stream real-time logs
   */
  streamLogs: {
    name: 'stream_logs',
    description: 'Stream real-time logs from the device (Note: This creates a long-running process)',
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
        duration: {
          type: 'number',
          description: 'Stream duration in seconds (max: 300, default: 60)',
          minimum: 1,
          maximum: 300,
          default: 60
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
      duration?: number;
      deviceId?: string;
    }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const duration = Math.min(args.duration || 60, 300) * 1000; // Convert to milliseconds
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      // Build logcat command
      let command = 'logcat';

      if (args.level) {
        command += ` *:${args.level}`;
      }

      if (args.tag) {
        command += ` ${args.tag}:*`;
      }

      if (args.packageName) {
        command += ` --pid=$(pidof ${args.packageName})`;
      }

      // This is a simplified implementation - in a real scenario, you'd want
      // to use streaming or websockets for real-time log delivery
      const result = await client.executeShell(`${command} | head -n 100`, deviceId);

      return {
        success: result.success,
        data: {
          deviceId,
          filter: {
            level: args.level,
            tag: args.tag,
            packageName: args.packageName,
            duration: duration / 1000
          },
          logs: result.stdout.split('\n').filter(line => line.trim()),
          note: 'This is a simplified implementation. For real-time streaming, consider implementing a WebSocket or SSE endpoint.',
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Manage wireless ADB connections
   */
  manageWirelessConnection: {
    name: 'manage_wireless_connection',
    description: 'Manage wireless ADB connections',
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          description: 'Action to perform',
          enum: ['list', 'connect', 'disconnect', 'pair']
        },
        host: {
          type: 'string',
          description: 'IP address or hostname (required for connect/disconnect/pair)'
        },
        port: {
          type: 'number',
          description: 'Port number (default: 5555)',
          default: 5555
        },
        pairingPort: {
          type: 'number',
          description: 'Pairing port (required for pair action, default: 4321)',
          default: 4321
        },
        code: {
          type: 'string',
          description: 'Pairing code (required for pair action)'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['action']
    },
    handler: async (args: {
      action: string;
      host?: string;
      port?: number;
      pairingPort?: number;
      code?: string;
      deviceId?: string;
    }) => {
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      const { action, host, port = 5555, pairingPort = 4321, code } = args;

      switch (action) {
      case 'list': {
        const devices = await client.getDevices();
        const wirelessDevices: WirelessConnection[] = [];

        for (const device of devices) {
          if (device.id.includes(':') || device.id.match(/^\d+\.\d+\.\d+\.\d+:\d+$/)) {
            const [ip, devicePort] = device.id.split(':');
            wirelessDevices.push({
              deviceId: device.id,
              ipAddress: ip,
              port: parseInt(devicePort || port.toString()),
              paired: true,
              connected: device.status === 'device',
              lastSeen: new Date().toISOString()
            });
          }
        }

        return {
          success: true,
          data: {
            wirelessDevices,
            count: wirelessDevices.length
          }
        };
      }

      case 'connect': {
        if (!host) {
          throw new Error('Host is required for connect action');
        }

        const success = await client.connect(host, port);

        return {
          success,
          data: {
            action: 'connect',
            host,
            port,
            connected: success,
            timestamp: new Date().toISOString()
          }
        };
      }

      case 'disconnect': {
        if (!host) {
          // Disconnect all wireless connections
          const result = await client.executeCommand('disconnect');
          return {
            success: result.success,
            data: {
              action: 'disconnect_all',
              stdout: result.stdout,
              stderr: result.stderr,
              exitCode: result.exitCode
            }
          };
        }

        const success = await client.disconnect(host, port);

        return {
          success,
          data: {
            action: 'disconnect',
            host,
            port,
            disconnected: success,
            timestamp: new Date().toISOString()
          }
        };
      }

      case 'pair': {
        if (!host || !code) {
          throw new Error('Host and pairing code are required for pair action');
        }

        const result = await client.executeCommand(`pair ${host}:${pairingPort} ${code}`);

        return {
          success: result.success,
          data: {
            action: 'pair',
            host,
            pairingPort,
            paired: result.success,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode
          }
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
      }
    }
  },

  /**
   * Stream file content from device
   */
  streamFile: {
    name: 'stream_file',
    description: 'Stream file content from device (for large files or real-time reading)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file on device'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        },
        chunkSize: {
          type: 'number',
          description: 'Chunk size in bytes (default: 8192)',
          default: 8192,
          minimum: 1024,
          maximum: 1048576
        },
        offset: {
          type: 'number',
          description: 'Start offset in bytes (default: 0)',
          default: 0,
          minimum: 0
        },
        length: {
          type: 'number',
          description: 'Number of bytes to read (default: read to end)',
          minimum: 1
        }
      },
      required: ['path']
    },
    handler: async (args: {
      path: string;
      deviceId?: string;
      chunkSize?: number;
      offset?: number;
      length?: number;
    }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const path = validateFilePath(args.path);
      const chunkSize = Math.min(Math.max(args.chunkSize || 8192, 1024), 1048576);
      const offset = args.offset || 0;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      // Check if file exists and get its size
      const statResult = await client.executeShell(`stat -c "%s" "${path}"`, deviceId);
      if (!statResult.success) {
        throw new Error(`File not found: ${path}`);
      }

      const fileSize = parseInt(statResult.stdout.trim());
      if (offset >= fileSize) {
        throw new Error('Offset exceeds file size');
      }

      const readLength = args.length ? Math.min(args.length, fileSize - offset) : fileSize - offset;
      const chunks: string[] = [];

      // Read file in chunks
      for (let currentOffset = offset; currentOffset < offset + readLength; currentOffset += chunkSize) {
        const currentChunkSize = Math.min(chunkSize, offset + readLength - currentOffset);
        const command = `dd if="${path}" bs=1 skip=${currentOffset} count=${currentChunkSize} 2>/dev/null | base64`;

        const result = await client.executeShell(command, deviceId);
        if (result.success && result.stdout.trim()) {
          chunks.push(result.stdout.trim());
        } else {
          break;
        }
      }

      // Combine all chunks
      const base64Content = chunks.join('');
      const content = Buffer.from(base64Content, 'base64').toString('binary');

      return {
        success: true,
        data: {
          deviceId,
          path,
          fileSize,
          offset,
          readLength: content.length,
          chunkSize,
          chunks: chunks.length,
          content: content.substring(0, 1000), // Return first 1KB as preview
          base64Content,
          note: 'Full content is available in base64Content field. For very large files, consider implementing chunked transfer.',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
};

export default advancedTools;
