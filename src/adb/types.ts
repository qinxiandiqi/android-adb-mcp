export interface Device {
  id: string;
  model: string;
  product: string;
  device: string;
  transportId: string;
  status: 'device' | 'offline' | 'unauthorized' | 'missing';
}

export interface AdbCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface AdbOptions {
  deviceId?: string;
  timeout?: number;
}

export interface AppInfo {
  packageName: string;
  versionName?: string;
  versionCode?: string;
  installTime?: string;
  updateTime?: string;
  flags?: string[];
}

export interface FileInfo {
  permissions: string;
  owner: string;
  group: string;
  size: string;
  date: string;
  name: string;
  type: 'file' | 'directory' | 'link';
}

export interface LogEntry {
  timestamp: string;
  level: string;
  tag: string;
  message: string;
  pid?: number;
  tid?: number;
}

export interface ScreenCaptureOptions {
  format?: 'png' | 'jpg';
  quality?: number; // for jpg only, 1-100
}

export interface ScreenRecordOptions {
  duration?: number; // seconds
  bitrate?: number; // Mbps
  size?: string; // e.g., "1280x720"
  rotation?: number; // 0, 90, 180, 270
}
