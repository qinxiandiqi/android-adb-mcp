import { AdbClient } from '../adb/client';
import { validateDeviceId, validateHost, validatePort } from '../utils/validation';

const deviceTools = {
  /**
   * List all connected devices
   */
  listDevices: {
    name: 'list_devices',
    description: 'List all connected Android devices',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
    handler: async () => {
      const client = new AdbClient();
      
      if (!await client.isAvailable()) {
        throw new Error('ADB is not available. Please ensure Android SDK is installed and ADB is in your PATH.');
      }

      const devices = await client.getDevices();
      
      return {
        success: true,
        data: {
          devices,
          count: devices.length
        }
      };
    }
  },

  /**
   * Get detailed information about a specific device
   */
  getDeviceInfo: {
    name: 'get_device_info',
    description: 'Get detailed information about a specific Android device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (use list_devices to get available devices)'
        }
      },
      required: ['deviceId']
    },
    handler: async (args: { deviceId: string }) => {
      const deviceId = validateDeviceId(args.deviceId);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (!await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const deviceInfo = await client.getDeviceInfo(deviceId);
      const devices = await client.getDevices();
      const device = devices.find(d => d.id === deviceId);

      return {
        success: true,
        data: {
          device,
          properties: deviceInfo
        }
      };
    }
  },

  /**
   * Connect to a device via TCP/IP
   */
  connectDevice: {
    name: 'connect_device',
    description: 'Connect to an Android device via TCP/IP',
    inputSchema: {
      type: 'object' as const,
      properties: {
        host: {
          type: 'string',
          description: 'IP address or hostname of the device'
        },
        port: {
          type: 'number',
          description: 'Port number (default: 5555)',
          default: 5555
        }
      },
      required: ['host']
    },
    handler: async (args: { host: string; port?: number }) => {
      const host = validateHost(args.host);
      const port = validatePort(args.port || 5555);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      const success = await client.connect(host, port);
      
      return {
        success,
        data: {
          host,
          port,
          connected: success
        }
      };
    }
  },

  /**
   * Disconnect from a device
   */
  disconnectDevice: {
    name: 'disconnect_device',
    description: 'Disconnect from an Android device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        host: {
          type: 'string',
          description: 'IP address or hostname of the device (optional, disconnects all if not provided)'
        },
        port: {
          type: 'number',
          description: 'Port number (default: 5555)',
          default: 5555
        }
      },
      required: []
    },
    handler: async (args: { host?: string; port?: number }) => {
      const host = args.host ? validateHost(args.host) : undefined;
      const port = args.port ? validatePort(args.port) : undefined;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      const success = await client.disconnect(host, port);
      
      return {
        success,
        data: {
          host,
          port,
          disconnected: success
        }
      };
    }
  },

  /**
   * Wait for a device to be connected
   */
  waitForDevice: {
    name: 'wait_for_device',
    description: 'Wait for a device to be connected and ready',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, waits for any device if not provided)'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in seconds (default: 30)',
          default: 30
        }
      },
      required: []
    },
    handler: async (args: { deviceId?: string; timeout?: number }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const timeout = (args.timeout || 30) * 1000; // Convert to milliseconds
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      const success = await client.waitForDevice(deviceId, timeout);
      
      return {
        success,
        data: {
          deviceId,
          timeout: timeout / 1000,
          ready: success
        }
      };
    }
  },

  /**
   * Check device connection status
   */
  checkDeviceStatus: {
    name: 'check_device_status',
    description: 'Check if a device is connected and ready',
    inputSchema: {
      type: 'object' as const,
      properties: {
        deviceId: {
          type: 'string',
          description: 'Device ID to check'
        }
      },
      required: ['deviceId']
    },
    handler: async (args: { deviceId: string }) => {
      const deviceId = validateDeviceId(args.deviceId);
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      const isConnected = await client.isDeviceConnected(deviceId);
      const devices = await client.getDevices();
      const device = devices.find(d => d.id === deviceId);
      
      return {
        success: true,
        data: {
          deviceId,
          connected: isConnected,
          status: device?.status || 'missing',
          device
        }
      };
    }
  }
};

export default deviceTools;
