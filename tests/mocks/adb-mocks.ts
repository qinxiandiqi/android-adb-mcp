import { mock } from 'jest-mock-extended';
import { spawn } from 'child_process';
import { AdbCommandResult, AppInfo, LogEntry } from '../../src/adb/types';

// Define DeviceInfo interface since it's not exported
export interface DeviceInfo {
  deviceId: string;
  model: string;
  manufacturer: string;
  androidVersion: string;
  apiLevel: number;
  architecture: string;
  status: string;
  product: string;
  serial: string;
}

// Mock child_process.spawn
export const mockSpawn = jest.mocked(spawn);

// Mock test data
export const mockDeviceInfo: DeviceInfo = {
  deviceId: 'emulator-5554',
  model: 'sdk_gphone_x86',
  manufacturer: 'Google',
  androidVersion: '13',
  apiLevel: 33,
  architecture: 'x86_64',
  status: 'device',
  product: 'sdk_gphone_x86',
  serial: 'emulator-5554'
};

export const mockAppInfo: AppInfo = {
  packageName: 'com.example.app',
  versionName: '1.0.0',
  versionCode: '1',
  installTime: '2023-01-01 00:00:00',
  updateTime: '2023-01-01 00:00:00'
};

export const mockLogEntry: LogEntry = {
  timestamp: '01-01 12:00:00.000',
  level: 'I',
  tag: 'TestTag',
  message: 'Test log message',
  pid: 1234,
  tid: 1234
};

export const mockSuccessResult: AdbCommandResult = {
  success: true,
  stdout: 'Success',
  stderr: '',
  exitCode: 0
};

export const mockFailureResult: AdbCommandResult = {
  success: false,
  stdout: '',
  stderr: 'Error occurred',
  exitCode: 1
};

// Mock process helpers
export const createMockProcess = (result: AdbCommandResult) => {
  const mockProcess: any = mock();
  mockProcess.stdout = mock();
  mockProcess.stderr = mock();
  
  // Store callbacks
  let closeCallback: any = null;
  let stdoutDataCallback: any = null;
  let stderrDataCallback: any = null;
  let stdoutEndCallback: any = null;
  let stderrEndCallback: any = null;
  
  mockProcess.on.mockImplementation((event: string, callback: any) => {
    if (event === 'close') {
      closeCallback = callback;
    }
    return mockProcess;
  });
  
  mockProcess.stdout.on.mockImplementation((event: string, callback: any) => {
    if (event === 'data') {
      stdoutDataCallback = callback;
    } else if (event === 'end') {
      stdoutEndCallback = callback;
    }
    return mockProcess.stdout;
  });
  
  mockProcess.stderr.on.mockImplementation((event: string, callback: any) => {
    if (event === 'data') {
      stderrDataCallback = callback;
    } else if (event === 'end') {
      stderrEndCallback = callback;
    }
    return mockProcess.stderr;
  });
  
  // Simulate data events and close
  setTimeout(() => {
    if (stdoutDataCallback && result.stdout) {
      stdoutDataCallback(Buffer.from(result.stdout));
    }
    if (stderrDataCallback && result.stderr) {
      stderrDataCallback(Buffer.from(result.stderr));
    }
    
    // Emit end events
    if (stdoutEndCallback) {
      stdoutEndCallback();
    }
    if (stderrEndCallback) {
      stderrEndCallback();
    }
    
    // Emit close event
    if (closeCallback) {
      closeCallback(result.exitCode);
    }
  }, 10);
  
  return mockProcess;
};

// Mock ADB command outputs
export const mockAdbOutputs = {
  devices: 'List of devices attached\nemulator-5554\tdevice\n192.168.1.100:5555\tdevice',
  deviceInfo: `Model: sdk_gphone_x86
Manufacturer: Google
Android version: 13
API level: 33
Architecture: x86_64
Product: sdk_gphone_x86
Serial: emulator-5554`,
  packages: 'package:/data/app/com.example.app/base.apk=com.example.app',
  shellOutput: 'Shell command output',
  screenshot: 'PNG screenshot data',
  logcat: `01-01 12:00:00.000 1234 1234 I TestTag: Test log message
01-01 12:00:01.000 1235 1235 D AnotherTag: Another message`,
  processes: 'USER     PID   PPID  VSIZE  RSS   WCHAN            PC  NAME\nroot      1     0     1234   567   ffffffff 00000000 S /init',
  memory: 'MemTotal:        4096000 kB\nMemFree:         2048000 kB',
  disk: '/dev/block/system 2048000 1024000 1024000 50% /system',
  screenInfo: 'Physical size: 1080x1920\nPhysical density: 420'
};
