import { z } from 'zod';

// Device ID validation
export const deviceIdSchema = z.string().min(1).max(100).refine(
  (id) => id.trim().length > 0,
  {
    message: 'Device ID cannot be empty'
  }
);

// File path validation
export const filePathSchema = z.string().min(1).max(500).refine(
  (path) => {
    // Basic path validation - prevent directory traversal
    return !path.includes('..') && !path.includes('~') && path.trim().length > 0;
  },
  {
    message: 'Invalid file path: directory traversal not allowed'
  }
);

// Package name validation (Android package format)
export const packageNameSchema = z.string().regex(
  /^[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z][a-zA-Z0-9_-]*){2,}$/,
  {
    message: 'Invalid Android package name format'
  }
);

// Shell command validation - allow only safe commands
const safeCommands = [
  'ls', 'cat', 'grep', 'find', 'ps', 'top', 'df', 'free', 'uptime',
  'date', 'whoami', 'id', 'pwd', 'echo', 'which', 'whereis', 'type',
  'getprop', 'dumpsys', 'pm', 'am', 'input', 'wm', 'settings'
];

export const shellCommandSchema = z.string().min(1).max(1000).refine(
  (command) => {
    // Check for dangerous characters
    const dangerousChars = [';', '&&', '||', '|', '`', '$(', 'rm -rf', 'dd if=', 'mkfs', 'reboot', 'su'];
    const hasDangerousChars = dangerousChars.some(char => command.includes(char));
    if (hasDangerousChars) {
      return false;
    }

    const baseCommand = command.split(' ')[0];
    return safeCommands.includes(baseCommand) ||
           command.startsWith('pm ') ||
           command.startsWith('am ') ||
           command.startsWith('dumpsys ') ||
           command.startsWith('getprop ') ||
           command.startsWith('settings ') ||
           command.startsWith('input ') ||
           command.startsWith('wm ');
  },
  {
    message: 'Shell command not allowed for security reasons'
  }
);

// Host and port validation for TCP connection
export const hostSchema = z.string().regex(/^(?:\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9.-]+$/);
export const portSchema = z.number().int().min(1).max(65535);

// Screen capture options validation
export const screenCaptureOptionsSchema = z.object({
  format: z.enum(['png', 'jpg']).optional().default('png'),
  quality: z.number().int().min(1).max(100).optional()
});

// Screen record options validation
export const screenRecordOptionsSchema = z.object({
  duration: z.number().int().min(1).max(300).optional(), // max 5 minutes
  bitrate: z.number().int().min(1).max(50).optional(), // max 50 Mbps
  size: z.string().regex(/^\d+x\d+$/).optional(), // e.g., "1280x720"
  rotation: z.number().int().optional().refine(
    (val) => val === undefined || [0, 90, 180, 270].includes(val),
    {
      message: 'Rotation must be one of: 0, 90, 180, 270'
    }
  )
});

// Log filter validation
export const logFilterSchema = z.object({
  level: z.enum(['V', 'D', 'I', 'W', 'E']).optional(),
  tag: z.string().max(100).optional(),
  packageName: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z][a-zA-Z0-9_-]*){2,}$/).optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/).optional(), // time format
  count: z.number().int().min(1).max(1000).optional()
});

// Validation functions
export function validateDeviceId(deviceId: unknown): string {
  return deviceIdSchema.parse(deviceId);
}

export function validateFilePath(path: unknown): string {
  return filePathSchema.parse(path);
}

export function validatePackageName(packageName: unknown): string {
  return packageNameSchema.parse(packageName);
}

export function validateShellCommand(command: unknown): string {
  return shellCommandSchema.parse(command);
}

export function validateHost(host: unknown): string {
  return hostSchema.parse(host);
}

export function validatePort(port: unknown): number {
  return portSchema.parse(port);
}

export function validateScreenCaptureOptions(options: unknown) {
  return screenCaptureOptionsSchema.parse(options || {});
}

export function validateScreenRecordOptions(options: unknown) {
  return screenRecordOptionsSchema.parse(options || {});
}

export function validateLogFilter(filter: unknown) {
  return logFilterSchema.parse(filter || {});
}
