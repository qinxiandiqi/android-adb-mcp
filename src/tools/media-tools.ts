import { AdbClient } from '../adb/client';
import { validateDeviceId, validateScreenCaptureOptions, validateScreenRecordOptions } from '../utils/validation';
import { join } from 'path';
import { randomUUID } from 'crypto';

const mediaTools = {
  /**
   * Capture screenshot from device
   */
  captureScreenshot: {
    name: 'capture_screenshot',
    description: 'Capture a screenshot from the Android device',
    inputSchema: {
      type: 'object' as const,
      properties: {
        outputPath: {
          type: 'string',
          description: 'Local path to save the screenshot (optional, saves to temp if not provided)'
        },
        format: {
          type: 'string',
          description: 'Image format: png or jpg (default: png)',
          enum: ['png', 'jpg'],
          default: 'png'
        },
        quality: {
          type: 'number',
          description: 'Image quality for jpg format (1-100, default: 90)',
          minimum: 1,
          maximum: 100,
          default: 90
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { 
      outputPath?: string; 
      format?: string; 
      quality?: number; 
      deviceId?: string; 
    }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const options = validateScreenCaptureOptions({
        format: args.format as 'png' | 'jpg',
        quality: args.quality
      });
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      // Generate temp filename if not provided
      const outputPath = args.outputPath || join(process.cwd(), `screenshot_${randomUUID()}.${options.format}`);
      
      // Capture screenshot to device temp location
      const deviceTempPath = `/sdcard/screenshot_${randomUUID()}.${options.format}`;
      const captureCommand = `screencap -p ${deviceTempPath}`;
      
      const captureResult = await client.executeShell(captureCommand, deviceId);
      if (!captureResult.success) {
        throw new Error(`Failed to capture screenshot: ${captureResult.stderr}`);
      }

      try {
        // Pull screenshot to local
        const pullResult = await client.pullFile(deviceTempPath, outputPath, deviceId);
        if (!pullResult.success) {
          throw new Error(`Failed to pull screenshot: ${pullResult.stderr}`);
        }

        // Clean up temp file on device
        await client.executeShell(`rm ${deviceTempPath}`, deviceId);

        return {
          success: true,
          data: {
            deviceId,
            outputPath,
            format: options.format,
            quality: options.quality,
            size: pullResult.stdout
          }
        };
      } catch (error) {
        // Clean up temp file on device if pull failed
        await client.executeShell(`rm ${deviceTempPath}`, deviceId);
        throw error;
      }
    }
  },

  /**
   * Start screen recording
   */
  startScreenRecord: {
    name: 'start_screen_record',
    description: 'Start recording the device screen',
    inputSchema: {
      type: 'object' as const,
      properties: {
        duration: {
          type: 'number',
          description: 'Recording duration in seconds (max: 300, default: 30)',
          minimum: 1,
          maximum: 300,
          default: 30
        },
        bitrate: {
          type: 'number',
          description: 'Video bitrate in Mbps (1-50, default: 4)',
          minimum: 1,
          maximum: 50,
          default: 4
        },
        size: {
          type: 'string',
          description: 'Video resolution (e.g., "1280x720")',
          pattern: '^\\d+x\\d+$'
        },
        rotation: {
          type: 'number',
          description: 'Screen rotation (0, 90, 180, 270)',
          enum: [0, 90, 180, 270]
        },
        outputPath: {
          type: 'string',
          description: 'Local path to save the recording (optional, saves to temp if not provided)'
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: []
    },
    handler: async (args: { 
      duration?: number; 
      bitrate?: number; 
      size?: string; 
      rotation?: number; 
      outputPath?: string; 
      deviceId?: string; 
    }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const options = validateScreenRecordOptions({
        duration: args.duration,
        bitrate: args.bitrate,
        size: args.size,
        rotation: args.rotation
      });
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      // Generate temp filename if not provided
      const outputPath = args.outputPath || join(process.cwd(), `screenrecord_${randomUUID()}.mp4`);
      const deviceTempPath = `/sdcard/screenrecord_${randomUUID()}.mp4`;

      // Build screenrecord command
      let recordCommand = `screenrecord`;
      
      if (options.duration) {
        recordCommand += ` --time-limit ${options.duration}`;
      }
      
      if (options.bitrate) {
        recordCommand += ` --bit-rate ${options.bitrate * 1000000}`; // Convert to bps
      }
      
      if (options.size) {
        recordCommand += ` --size ${options.size}`;
      }
      
      if (options.rotation !== undefined) {
        recordCommand += ` --rotate ${options.rotation}`;
      }
      
      recordCommand += ` ${deviceTempPath}`;

      // Start recording
      const recordResult = await client.executeShell(recordCommand, deviceId);
      
      if (!recordResult.success && recordResult.exitCode !== 0) {
        // screenrecord exits with code 0 when interrupted (Ctrl+C), which is normal
        if (!recordResult.stderr.includes('Interrupted')) {
          throw new Error(`Failed to record screen: ${recordResult.stderr}`);
        }
      }

      try {
        // Pull recording to local
        const pullResult = await client.pullFile(deviceTempPath, outputPath, deviceId);
        if (!pullResult.success) {
          throw new Error(`Failed to pull recording: ${pullResult.stderr}`);
        }

        // Clean up temp file on device
        await client.executeShell(`rm ${deviceTempPath}`, deviceId);

        return {
          success: true,
          data: {
            deviceId,
            outputPath,
            duration: options.duration,
            bitrate: options.bitrate,
            size: options.size,
            rotation: options.rotation,
            fileSize: pullResult.stdout
          }
        };
      } catch (error) {
        // Clean up temp file on device if pull failed
        await client.executeShell(`rm ${deviceTempPath}`, deviceId);
        throw error;
      }
    }
  },

  /**
   * Get screen density and resolution
   */
  getScreenInfo: {
    name: 'get_screen_info',
    description: 'Get screen information including resolution and density',
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

      // Get physical display info
      const physicalResult = await client.executeShell('wm size', deviceId);
      const densityResult = await client.executeShell('wm density', deviceId);

      const screenInfo: any = {};

      // Parse physical size
      if (physicalResult.success) {
        const sizeMatch = physicalResult.stdout.match(/Physical size: (\d+)x(\d+)/);
        if (sizeMatch) {
          screenInfo.physicalWidth = parseInt(sizeMatch[1]);
          screenInfo.physicalHeight = parseInt(sizeMatch[2]);
          screenInfo.physicalSize = `${sizeMatch[1]}x${sizeMatch[2]}`;
        }
      }

      // Parse density
      if (densityResult.success) {
        const densityMatch = densityResult.stdout.match(/Physical density: (\d+)/);
        if (densityMatch) {
          screenInfo.physicalDensity = parseInt(densityMatch[1]);
        }

        const overrideMatch = densityResult.stdout.match(/Override density: (\d+)/);
        if (overrideMatch) {
          screenInfo.overrideDensity = parseInt(overrideMatch[1]);
        }
      }

      return {
        success: true,
        data: {
          deviceId,
          screenInfo
        }
      };
    }
  },

  /**
   * Set screen density
   */
  setScreenDensity: {
    name: 'set_screen_density',
    description: 'Set screen density (requires root or developer options)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        density: {
          type: 'number',
          description: 'Screen density (e.g., 160, 240, 320, 480, 640)',
          minimum: 80,
          maximum: 1000
        },
        deviceId: {
          type: 'string',
          description: 'Device ID (optional, uses default device if not provided)'
        }
      },
      required: ['density']
    },
    handler: async (args: { density: number; deviceId?: string }) => {
      const deviceId = args.deviceId ? validateDeviceId(args.deviceId) : undefined;
      const client = new AdbClient();

      if (!await client.isAvailable()) {
        throw new Error('ADB is not available');
      }

      if (deviceId && !await client.isDeviceConnected(deviceId)) {
        throw new Error(`Device ${deviceId} is not connected or not authorized`);
      }

      const command = `wm density ${args.density}`;
      const result = await client.executeShell(command, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          density: args.density,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  },

  /**
   * Reset screen density to default
   */
  resetScreenDensity: {
    name: 'reset_screen_density',
    description: 'Reset screen density to default value',
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

      const command = 'wm density reset';
      const result = await client.executeShell(command, deviceId);
      
      return {
        success: result.success,
        data: {
          deviceId,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        }
      };
    }
  }
};

export default mediaTools;
