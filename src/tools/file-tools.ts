import { AdbClient } from '../adb/client';
import { validateDeviceId, validateFilePath } from '../utils/validation';
import { FileInfo } from '../adb/types';

const fileTools = {
  /**
   * List files and directories in a path
   */
  listFiles: {
    name: 'list_files',
    description: 'List files and directories in a specified path on the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Path to list (default: /sdcard/)',
          default: '/sdcard/'
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
      const path = validateFilePath(args.path || '/sdcard/');
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.executeShell(`ls -la "${path}"`, deviceId);
      
      if (!result.success) {
        throw new Error(`Failed to list files: ${result.stderr}`);
      }

      // Parse file list
      const lines = result.stdout.split('\n');
      const files: FileInfo[] = [];
      
      // Skip header lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('total')) continue;

        const parts = line.split(/\s+/);
        if (parts.length >= 9) {
          const permissions = parts[0];
          const owner = parts[1];
          const group = parts[2];
          const size = parts[3];
          const date = parts[4] + ' ' + parts[5] + ' ' + parts[6];
          const name = parts.slice(8).join(' ');

          let type: 'file' | 'directory' | 'link' = 'file';
          if (permissions.startsWith('d')) {
            type = 'directory';
          } else if (permissions.startsWith('l')) {
            type = 'link';
          }

          files.push({
            permissions,
            owner,
            group,
            size,
            date,
            name,
            type
          });
        }
      }

      return {
        success: true,
        data: {
          deviceId,
          path,
          files,
          count: files.length
        }
      };
    }
  },

  /**
   * Push a file to the device
   */
  pushFile: {
    name: 'push_file',
    description: 'Push a file from local machine to the Android device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        localPath: {
          type: 'string',
          description: 'Local file path to push'
        },
        remotePath: {
          type: 'string',
          description: 'Remote path on the device'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['localPath', 'remotePath']
    },
    handler: async (args: { localPath: string; remotePath: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const localPath = validateFilePath(args.localPath);
      const remotePath = validateFilePath(args.remotePath);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.pushFile(localPath, remotePath, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          localPath,
          remotePath,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Pull a file from the device
   */
  pullFile: {
    name: 'pull_file',
    description: 'Pull a file from the Android device to local machine',
    inputSchema: {
      type: 'object' as const,
      properties: {
        remotePath: {
          type: 'string',
          description: 'Remote path on the device'
        },
        localPath: {
          type: 'string',
          description: 'Local file path to save the file'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['remotePath', 'localPath']
    },
    handler: async (args: { remotePath: string; localPath: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const remotePath = validateFilePath(args.remotePath);
      const localPath = validateFilePath(args.localPath);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.pullFile(remotePath, localPath, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          remotePath,
          localPath,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Create a directory on the device
   */
  createDirectory: {
    name: 'create_directory',
    description: 'Create a directory on the Android device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to create'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['path']
    },
    handler: async (args: { path: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const path = validateFilePath(args.path);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.executeShell(`mkdir -p "${path}"`, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          path,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Remove a file or directory on the device
   */
  removeFile: {
    name: 'remove_file',
    description: 'Remove a file or directory on the Android device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'File or directory path to remove'
        },
        recursive: {
          type: 'boolean',
          description: 'Remove directories recursively (default: false)',
          default: false
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['path']
    },
    handler: async (args: { path: string; recursive?: boolean; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const path = validateFilePath(args.path);
      const recursive = args.recursive || false;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const command = recursive ? `rm -rf "${path}"` : `rm -f "${path}"`;
      const result = await client.executeShell(command, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          path,
          recursive,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Get file information
   */
  getFileInfo: {
    name: 'get_file_info',
    description: 'Get detailed information about a file on the device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'File path to get information about'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['path']
    },
    handler: async (args: { path: string; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const path = validateFilePath(args.path);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const result = await client.executeShell(`stat "${path}"`, deviceId);
      
      if (!result.success) {
        throw new Error(`Failed to get file info: ${result.stderr}`);
      }

      // Parse stat output
      const statOutput = result.stdout;
      const fileInfo: any = {
        path,
        exists: true
      };

      // Extract information from stat output
      const sizeMatch = statOutput.match(/Size:\s*(\d+)/);
      if (sizeMatch) {
        fileInfo.size = parseInt(sizeMatch[1]);
      }

      const accessTimeMatch = statOutput.match(/Access:\s*(.+)/);
      if (accessTimeMatch) {
        fileInfo.accessTime = accessTimeMatch[1];
      }

      const modifyTimeMatch = statOutput.match(/Modify:\s*(.+)/);
      if (modifyTimeMatch) {
        fileInfo.modifyTime = modifyTimeMatch[1];
      }

      const changeTimeMatch = statOutput.match(/Change:\s*(.+)/);
      if (changeTimeMatch) {
        fileInfo.changeTime = changeTimeMatch[1];
      }

      return {
        success: true,
        data: {
          deviceId,
          fileInfo,
          rawOutput: statOutput
        }
      };
    }
  }
};

export default fileTools;
