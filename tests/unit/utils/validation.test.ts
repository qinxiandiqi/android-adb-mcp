import {
  validateDeviceId,
  validatePackageName,
  validateFilePath,
  validateShellCommand,
  validateLogFilter,
  validateScreenCaptureOptions,
  validateScreenRecordOptions
} from '../../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateDeviceId', () => {
    it('should validate valid device IDs', () => {
      expect(validateDeviceId('emulator-5554')).toBe('emulator-5554');
      expect(validateDeviceId('192.168.1.100:5555')).toBe('192.168.1.100:5555');
      expect(validateDeviceId('ABCD1234')).toBe('ABCD1234');
    });

    it('should throw error for invalid device IDs', () => {
      expect(() => validateDeviceId('')).toThrow();
      expect(() => validateDeviceId('   ')).toThrow();
      expect(() => validateDeviceId('a'.repeat(101))).toThrow();
    });
  });

  describe('validatePackageName', () => {
    it('should validate valid package names', () => {
      expect(validatePackageName('com.example.app')).toBe('com.example.app');
      expect(validatePackageName('com.company.test')).toBe('com.company.test');
      expect(validatePackageName('org.open-source.project')).toBe('org.open-source.project');
    });

    it('should throw error for invalid package names', () => {
      expect(() => validatePackageName('')).toThrow();
      expect(() => validatePackageName('com.example')).toThrow(); // missing domain
      expect(() => validatePackageName('com.example.')).toThrow(); // ends with dot
      expect(() => validatePackageName('com.example.app ')).toThrow(); // trailing space
      expect(() => validatePackageName('com.example.app!')).toThrow(); // invalid character
      expect(() => validatePackageName('a'.repeat(101))).toThrow();
    });
  });

  describe('validateFilePath', () => {
    it('should validate valid file paths', () => {
      expect(validateFilePath('/path/to/file.txt')).toBe('/path/to/file.txt');
      expect(validateFilePath('C:\\Users\\file.txt')).toBe('C:\\Users\\file.txt');
      expect(validateFilePath('./relative/path.txt')).toBe('./relative/path.txt');
      expect(validateFilePath('file.txt')).toBe('file.txt');
    });

    it('should throw error for invalid file paths', () => {
      expect(() => validateFilePath('')).toThrow();
      expect(() => validateFilePath('   ')).toThrow();
      expect(() => validateFilePath('a'.repeat(501))).toThrow();
    });
  });

  describe('validateShellCommand', () => {
    it('should validate safe shell commands', () => {
      expect(validateShellCommand('ls -la')).toBe('ls -la');
      expect(validateShellCommand('getprop ro.product.model')).toBe('getprop ro.product.model');
      expect(validateShellCommand('pm list packages')).toBe('pm list packages');
    });

    it('should throw error for dangerous commands', () => {
      expect(() => validateShellCommand('rm -rf /')).toThrow();
      expect(() => validateShellCommand('dd if=/dev/zero')).toThrow();
      expect(() => validateShellCommand('mkfs.ext4 /dev/block')).toThrow();
      expect(() => validateShellCommand('reboot')).toThrow();
      expect(() => validateShellCommand('su')).toThrow();
    });

    it('should throw error for empty commands', () => {
      expect(() => validateShellCommand('')).toThrow();
      expect(() => validateShellCommand('   ')).toThrow();
    });

    it('should throw error for commands with suspicious characters', () => {
      expect(() => validateShellCommand('ls; rm -rf /')).toThrow();
      expect(() => validateShellCommand('ls && rm -rf /')).toThrow();
      expect(() => validateShellCommand('ls | rm -rf /')).toThrow();
      expect(() => validateShellCommand('ls `rm -rf /`')).toThrow();
      expect(() => validateShellCommand('ls $(rm -rf /)')).toThrow();
    });
  });

  describe('validateLogFilter', () => {
    it('should validate valid log filters', () => {
      expect(validateLogFilter({})).toEqual({});
      expect(validateLogFilter({ level: 'I' })).toEqual({ level: 'I' });
      expect(validateLogFilter({ tag: 'TestTag' })).toEqual({ tag: 'TestTag' });
      expect(validateLogFilter({ packageName: 'com.example.app' })).toEqual({ packageName: 'com.example.app' });
      expect(validateLogFilter({ count: 100 })).toEqual({ count: 100 });
      expect(validateLogFilter({ since: '2023-01-01 00:00:00' })).toEqual({ since: '2023-01-01 00:00:00' });
    });

    it('should throw error for invalid log levels', () => {
      expect(() => validateLogFilter({ level: 'X' })).toThrow();
      expect(() => validateLogFilter({ level: 'invalid' })).toThrow();
    });

    it('should throw error for invalid tag length', () => {
      expect(() => validateLogFilter({ tag: 'a'.repeat(101) })).toThrow();
    });

    it('should throw error for invalid package name', () => {
      expect(() => validateLogFilter({ packageName: 'invalid' })).toThrow();
    });

    it('should throw error for invalid count', () => {
      expect(() => validateLogFilter({ count: 0 })).toThrow();
      expect(() => validateLogFilter({ count: 1001 })).toThrow();
    });

    it('should throw error for invalid date format', () => {
      expect(() => validateLogFilter({ since: 'invalid-date' })).toThrow();
    });
  });

  describe('validateScreenCaptureOptions', () => {
    it('should validate valid capture options', () => {
      expect(validateScreenCaptureOptions({})).toEqual({ format: 'png' });
      expect(validateScreenCaptureOptions({ format: 'png' })).toEqual({ format: 'png' });
      expect(validateScreenCaptureOptions({ format: 'jpg' })).toEqual({ format: 'jpg' });
      expect(validateScreenCaptureOptions({ quality: 90 })).toEqual({ format: 'png', quality: 90 });
    });

    it('should throw error for invalid format', () => {
      expect(() => validateScreenCaptureOptions({ format: 'gif' })).toThrow();
    });

    it('should throw error for invalid quality', () => {
      expect(() => validateScreenCaptureOptions({ quality: 0 })).toThrow();
      expect(() => validateScreenCaptureOptions({ quality: 101 })).toThrow();
    });
  });

  describe('validateScreenRecordOptions', () => {
    it('should validate valid record options', () => {
      expect(validateScreenRecordOptions({})).toEqual({});
      expect(validateScreenRecordOptions({ duration: 30 })).toEqual({ duration: 30 });
      expect(validateScreenRecordOptions({ bitrate: 4 })).toEqual({ bitrate: 4 });
      expect(validateScreenRecordOptions({ size: '1280x720' })).toEqual({ size: '1280x720' });
      expect(validateScreenRecordOptions({ rotation: 0 })).toEqual({ rotation: 0 });
    });

    it('should throw error for invalid duration', () => {
      expect(() => validateScreenRecordOptions({ duration: 0 })).toThrow();
      expect(() => validateScreenRecordOptions({ duration: 301 })).toThrow();
    });

    it('should throw error for invalid bitrate', () => {
      expect(() => validateScreenRecordOptions({ bitrate: 0 })).toThrow();
      expect(() => validateScreenRecordOptions({ bitrate: 51 })).toThrow();
    });

    it('should throw error for invalid size format', () => {
      expect(() => validateScreenRecordOptions({ size: 'invalid' })).toThrow();
      expect(() => validateScreenRecordOptions({ size: '1280x' })).toThrow();
      expect(() => validateScreenRecordOptions({ size: 'x720' })).toThrow();
    });

    it('should throw error for invalid rotation', () => {
      expect(() => validateScreenRecordOptions({ rotation: 45 })).toThrow();
      expect(() => validateScreenRecordOptions({ rotation: 135 })).toThrow();
    });
  });
});
