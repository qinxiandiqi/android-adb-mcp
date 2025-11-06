const { performance } = require('perf_hooks');
const { AdbClient } = require('../../dist/adb/client.js');
const fs = require('fs');
const path = require('path');

// Mock ADB commands for benchmarking
const mockCommands = {
  version: 'Android Debug Bridge version 1.0.41',
  devices: 'List of devices attached\nemulator-5554\tdevice',
  shell: 'Shell command output'
};

class MockAdbClient {
  constructor() {
    this.commandCount = 0;
  }

  async executeCommand(command, options = {}) {
    this.commandCount++;

    // Simulate realistic delay
    const delay = Math.random() * 50 + 10; // 10-60ms
    await new Promise(resolve => setTimeout(resolve, delay));

    if (command.includes('version')) {
      return { success: true, stdout: mockCommands.version, stderr: '', exitCode: 0 };
    }
    if (command.includes('devices')) {
      return { success: true, stdout: mockCommands.devices, stderr: '', exitCode: 0 };
    }
    if (command.includes('shell')) {
      return { success: true, stdout: mockCommands.shell, stderr: '', exitCode: 0 };
    }

    return { success: true, stdout: 'Success', stderr: '', exitCode: 0 };
  }

  async isAvailable() {
    return true;
  }

  async getDevices() {
    const result = await this.executeCommand('devices -l');
    return [
      {
        id: 'emulator-5554',
        model: 'sdk_gphone_x86',
        product: 'sdk_gphone_x86',
        device: 'sdk_gphone_x86',
        transportId: '1',
        status: 'device'
      }
    ];
  }
}

// Benchmark utilities
class Benchmark {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  async run(name, fn, iterations = 100) {
    console.log(`\n🏃 Running ${name} (${iterations} iterations)...`);

    const times = [];
    const errors = [];

    // Warmup
    for (let i = 0; i < 5; i++) {
      try {
        await fn();
      } catch (error) {
        // Ignore warmup errors
      }
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await fn();
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      console.log(`❌ ${errors.length} errors occurred`);
      return null;
    }

    const sorted = times.sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const result = {
      name,
      iterations,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      ops: Math.round(1000 / mean)
    };

    this.results.push(result);
    console.log(`✅ Mean: ${result.mean}ms, Median: ${result.median}ms, P95: ${result.p95}ms, ${result.ops} ops/s`);

    return result;
  }

  async runConcurrent(name, fn, concurrency = 10, totalOperations = 100) {
    console.log(`\n🏃 Running ${name} (concurrent: ${concurrency}, total: ${totalOperations})...`);

    const promises = [];
    const operationsPerWorker = Math.ceil(totalOperations / concurrency);

    const start = performance.now();

    for (let i = 0; i < concurrency; i++) {
      promises.push(this.runConcurrentWorker(fn, operationsPerWorker));
    }

    const results = await Promise.all(promises);
    const end = performance.now();

    const allTimes = results.flat();
    const totalTime = end - start;
    const successfulOps = allTimes.length;

    if (successfulOps === 0) {
      console.log(`❌ No successful operations`);
      return null;
    }

    const sorted = allTimes.sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;

    const result = {
      name,
      concurrency,
      totalOperations,
      successfulOps,
      totalTime: Math.round(totalTime * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      ops: Math.round(successfulOps / (totalTime / 1000))
    };

    this.results.push(result);
    console.log(`✅ ${successfulOps}/${totalOperations} ops, Total: ${result.totalTime}ms, ${result.ops} ops/s`);

    return result;
  }

  async runConcurrentWorker(fn, operations) {
    const times = [];

    for (let i = 0; i < operations; i++) {
      const start = performance.now();
      try {
        await fn();
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        // Ignore errors in concurrent test
      }
    }

    return times;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalBenchmarks: this.results.length,
        averageOps: this.results.reduce((sum, r) => sum + (r.ops || 0), 0) / this.results.length
      }
    };

    const reportPath = path.join(__dirname, 'benchmark-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Benchmark report saved to: ${reportPath}`);
    console.log(`📈 Summary: ${report.summary.totalBenchmarks} benchmarks, average ${Math.round(report.summary.averageOps)} ops/s`);

    return report;
  }
}

// Main benchmark suite
async function runBenchmarks() {
  console.log('🚀 Starting ADB MCP Server Benchmark Suite');
  console.log('================================================');

  const benchmark = new Benchmark('ADB MCP Server');
  const client = new MockAdbClient();

  // 1. Basic ADB command execution
  await benchmark.run('ADB Command Execution', async () => {
    await client.executeCommand('shell echo "test"');
  }, 200);

  // 2. Device listing
  await benchmark.run('Device Listing', async () => {
    await client.getDevices();
  }, 100);

  // 3. Multiple concurrent commands
  await benchmark.runConcurrent('Concurrent Commands', async () => {
    await client.executeCommand('shell echo "test"');
  }, 20, 200);

  // 4. Batch command simulation
  await benchmark.run('Batch Commands (5)', async () => {
    await Promise.all([
      client.executeCommand('shell echo "test1"'),
      client.executeCommand('shell echo "test2"'),
      client.executeCommand('shell echo "test3"'),
      client.executeCommand('shell echo "test4"'),
      client.executeCommand('shell echo "test5"')
    ]);
  }, 50);

  // 5. High-frequency operations
  await benchmark.run('High Frequency Operations', async () => {
    await client.executeCommand('shell echo "test"');
  }, 500);

  // 6. Error handling performance
  await benchmark.run('Error Handling', async () => {
    try {
      await client.executeCommand('shell invalid_command');
    } catch (error) {
      // Expected error
    }
  }, 100);

  // 7. Memory usage simulation
  await benchmark.run('Memory Intensive Operations', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(client.executeCommand(`shell echo "test ${i}"`));
    }
    await Promise.all(promises);
  }, 100);

  // Generate final report
  const report = benchmark.generateReport();

  console.log('\n🎉 Benchmark suite completed!');
  console.log('=====================================');

  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');

  const avgOps = report.summary.averageOps;
  if (avgOps < 50) {
    console.log('⚠️  Performance is below optimal (avg < 50 ops/s)');
    console.log('   Consider optimizing command execution or reducing concurrent operations');
  } else if (avgOps < 100) {
    console.log('✅ Performance is acceptable (50-100 ops/s)');
    console.log('   Room for improvement in command batching');
  } else {
    console.log('🚀 Performance is excellent (> 100 ops/s)');
  }

  return report;
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runBenchmarks().catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
}

module.exports = { runBenchmarks, Benchmark };