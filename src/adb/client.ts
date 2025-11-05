import { spawn } from 'child_process';
import { Device, AdbCommandResult } from './types.js';

interface AdbOptions {
  deviceId?: string;
  timeout?: number;
}

export class AdbClient {
  private adbPath: string;

  constructor(adbPath: string = 'adb') {
    this.adbPath = adbPath;
  }

  /**
   * Execute an ADB command
   */
  async executeCommand(command: string, options: AdbOptions = {}): Promise<AdbCommandResult> {
    const { deviceId, timeout = 30000 } = options;
    
    let fullCommand = this.adbPath;
    if (deviceId) {
      fullCommand += ` -s ${deviceId}`;
    }
    fullCommand += ` ${command}`;

    return new Promise((resolve) => {
      const child = spawn(fullCommand, { shell: true });
      let stdout = '';
      let stderr = '';

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          stdout: '',
          stderr: `Command timed out after ${timeout}ms`,
          exitCode: -1
        });
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout: '',
          stderr: error.message,
          exitCode: -1
        });
      });
    });
  }

  /**
   * Check if ADB is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand('version');
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get list of connected devices
   */
  async getDevices(): Promise<Device[]> {
    const result = await this.executeCommand('devices -l');
    if (!result.success) {
      throw new Error(`Failed to get devices: ${result.stderr}`);
    }

    const lines = result.stdout.split('\n');
    const devices: Device[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const deviceId = parts[0];
      const status = parts[1] as Device['status'];

      let model = '';
      let product = '';
      let device = '';
      let transportId = '';

      for (let j = 2; j < parts.length; j++) {
        const part = parts[j];
        if (part.startsWith('model:')) {
          model = part.substring(6);
        } else if (part.startsWith('product:')) {
          product = part.substring(8);
        } else if (part.startsWith('device:')) {
          device = part.substring(7);
        } else if (part.startsWith('transport_id:')) {
          transportId = part.substring(13);
        }
      }

      devices.push({
        id: deviceId,
        model,
        product,
        device,
        transportId,
        status
      });
    }

    return devices;
  }

  /**
   * Get device information
   */
  async getDeviceInfo(deviceId: string): Promise<any> {
    const result = await this.executeCommand('shell getprop', { deviceId });
    if (!result.success) {
      throw new Error(`Failed to get device info: ${result.stderr}`);
    }

    const props: Record<string, string> = {};
    const lines = result.stdout.split('\n');

    for (const line of lines) {
      const match = line.match(/^\[(.+)\]: \[(.+)\]$/);
      if (match) {
        props[match[1]] = match[2];
      }
    }

    return props;
  }

  /**
   * Check if device is connected
   */
  async isDeviceConnected(deviceId: string): Promise<boolean> {
    const devices = await this.getDevices();
    return devices.some(device => device.id === deviceId && device.status === 'device');
  }

  /**
   * Wait for device to be connected
   */
  async waitForDevice(deviceId?: string, timeout = 30000): Promise<boolean> {
    const command = deviceId ? `wait-for-device ${deviceId}` : 'wait-for-device';
    const result = await this.executeCommand(command, { timeout });
    return result.success;
  }

  /**
   * Connect to a device via TCP/IP
   */
  async connect(host: string, port: number): Promise<boolean> {
    const result = await this.executeCommand(`connect ${host}:${port}`);
    return result.success;
  }

  /**
   * Disconnect from a device
   */
  async disconnect(host?: string, port?: number): Promise<boolean> {
    const target = host && port ? `${host}:${port}` : '';
    const result = await this.executeCommand(`disconnect ${target}`);
    return result.success;
  }

  /**
   * Execute shell command
   */
  async executeShell(command: string, deviceId?: string): Promise<AdbCommandResult> {
    return this.executeCommand(`shell "${command}"`, { deviceId });
  }

  /**
   * Push file to device
   */
  async pushFile(localPath: string, remotePath: string, deviceId?: string): Promise<AdbCommandResult> {
    return this.executeCommand(`push "${localPath}" "${remotePath}"`, { deviceId });
  }

  /**
   * Pull file from device
   */
  async pullFile(remotePath: string, localPath: string, deviceId?: string): Promise<AdbCommandResult> {
    return this.executeCommand(`pull "${remotePath}" "${localPath}"`, { deviceId });
  }

  /**
   * Install APK
   */
  async installApk(apkPath: string, deviceId?: string, options: {
    replace?: boolean;
    test?: boolean;
    allowDowngrade?: boolean;
    grantPermissions?: boolean;
  } = {}): Promise<AdbCommandResult> {
    let command = 'install';
    
    if (options.replace) command += ' -r';
    if (options.test) command += ' -t';
    if (options.allowDowngrade) command += ' -d';
    if (options.grantPermissions) command += ' -g';
    
    command += ` "${apkPath}"`;
    
    return this.executeCommand(command, { deviceId });
  }

  /**
   * Uninstall app
   */
  async uninstallApp(packageName: string, deviceId?: string, keepData = false): Promise<AdbCommandResult> {
    const command = `uninstall ${keepData ? '-k ' : ''}${packageName}`;
    return this.executeCommand(command, { deviceId });
  }
}
