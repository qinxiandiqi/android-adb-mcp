import { AdbClient } from '../../src/adb/client';

describe('AdbClient Working Test', () => {
  let adbClient: AdbClient;

  beforeEach(() => {
    adbClient = new AdbClient();
  });

  it('should create instance', () => {
    expect(adbClient).toBeInstanceOf(AdbClient);
  });

  it('should have correct methods', () => {
    expect(typeof adbClient.executeCommand).toBe('function');
    expect(typeof adbClient.isAvailable).toBe('function');
    expect(typeof adbClient.getDevices).toBe('function');
  });
});
