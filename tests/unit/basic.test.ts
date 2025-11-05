describe('Basic Test', () => {
  it('should run a simple test', () => {
    expect(true).toBe(true);
  });

  it('should import AdbClient', async () => {
    const { AdbClient } = await import('../../src/adb/client');
    expect(AdbClient).toBeDefined();
  });
});
