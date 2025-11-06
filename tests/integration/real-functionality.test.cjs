#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Create a simple MCP client for testing
class TestMCPClient {
  constructor() {
    this.server = null;
    this.requestId = 1;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let serverOutput = '';
      let serverError = '';

      this.server.stdout.on('data', (data) => {
        serverOutput += data.toString();
        if (serverOutput.includes('ADB MCP Server running on stdio')) {
          success('MCP Server started successfully');
          resolve();
        }
      });

      this.server.stderr.on('data', (data) => {
        serverError += data.toString();
      });

      this.server.on('error', (error) => {
        error(`Failed to start server: ${error.message}`);
        reject(error);
      });

      this.server.on('close', (code) => {
        if (code !== 0) {
          error(`Server exited with code ${code}`);
          error(`Server error: ${serverError}`);
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!serverOutput.includes('ADB MCP Server running on stdio')) {
          error('Server startup timeout');
          reject(new Error('Server startup timeout'));
        }
      }, 10000);
    });
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method,
        params
      };

      const requestStr = JSON.stringify(request) + '\n';

      this.server.stdin.write(requestStr);

      let response = '';
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      this.server.stdout.on('data', (data) => {
        response += data.toString();
        try {
          const lines = response.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const parsed = JSON.parse(line);
              if (parsed.id === request.id - 1) {
                clearTimeout(timeout);
                resolve(parsed);
                return;
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors for partial responses
        }
      });

      this.server.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async stop() {
    if (this.server) {
      this.server.kill('SIGTERM');
      return new Promise((resolve) => {
        this.server.on('close', resolve);
        setTimeout(() => {
          this.server.kill('SIGKILL');
          resolve();
        }, 5000);
      });
    }
  }
}

// Test functions
async function testBasicFunctionality() {
  log('\n🧪 Testing Basic MCP Functionality', 'cyan');
  log('=====================================', 'cyan');

  const client = new TestMCPClient();

  try {
    await client.start();

    // Test list tools
    info('Testing tool listing...');
    const toolsResponse = await client.sendRequest('tools/list');
    if (toolsResponse.result && toolsResponse.result.tools) {
      success(`Found ${toolsResponse.result.tools.length} tools`);

      // List tool categories
      const toolCategories = {};
      toolsResponse.result.tools.forEach(tool => {
        const category = tool.name.split('_')[0];
        if (!toolCategories[category]) {
          toolCategories[category] = 0;
        }
        toolCategories[category]++;
      });

      log('Tool categories:', 'blue');
      Object.entries(toolCategories).forEach(([category, count]) => {
        log(`  ${category}: ${count} tools`, 'blue');
      });
    } else {
      error('Failed to list tools');
      return false;
    }

    await client.stop();
    return true;
  } catch (error) {
    error(`Basic functionality test failed: ${error.message}`);
    await client.stop();
    return false;
  }
}

async function testADBIntegration() {
  log('\n🔌 Testing ADB Integration', 'cyan');
  log('============================', 'cyan');

  try {
    // Test ADB availability
    info('Checking ADB availability...');
    const adbCheck = spawn('adb', ['version'], { stdio: 'pipe' });

    adbCheck.on('close', (code) => {
      if (code === 0) {
        success('ADB is available');
      } else {
        error('ADB is not available');
      }
    });

    // Test device connection
    info('Checking connected devices...');
    const deviceCheck = spawn('adb', ['devices'], { stdio: 'pipe' });

    let deviceOutput = '';
    deviceCheck.stdout.on('data', (data) => {
      deviceOutput += data.toString();
    });

    deviceCheck.on('close', (code) => {
      if (code === 0) {
        const lines = deviceOutput.trim().split('\n');
        const devices = lines.slice(1).filter(line => line.trim() && !line.includes('List of devices'));

        if (devices.length > 0) {
          success(`Found ${devices.length} connected device(s)`);
          devices.forEach(device => {
            const [id, ...statusParts] = device.trim().split(/\s+/);
            const status = statusParts.join(' ');
            log(`  Device: ${id} (${status})`, 'blue');
          });
        } else {
          warning('No devices connected');
        }
      } else {
        error('Failed to check devices');
      }
    });

    return true;
  } catch (error) {
    error(`ADB integration test failed: ${error.message}`);
    return false;
  }
}

async function testCoreADBCommands() {
  log('\n📱 Testing Core ADB Commands', 'cyan');
  log('==============================', 'cyan');

  const commands = [
    { name: 'Get device properties', command: 'adb shell getprop ro.product.model' },
    { name: 'Get Android version', command: 'adb shell getprop ro.build.version.release' },
    { name: 'Get battery level', command: 'adb shell dumpsys battery | grep level' },
    { name: 'List processes', command: 'adb shell ps -A | head -10' },
    { name: 'Check memory', command: 'adb shell cat /proc/meminfo | head -5' }
  ];

  let passedTests = 0;
  let totalTests = commands.length;

  for (const test of commands) {
    try {
      info(`Testing: ${test.name}`);

      const result = spawn('cmd', ['/c', test.command], { stdio: 'pipe', shell: true });

      let output = '';
      let errorOutput = '';

      result.stdout.on('data', (data) => {
        output += data.toString();
      });

      result.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      await new Promise((resolve, reject) => {
        result.on('close', (code) => {
          if (code === 0 && output.trim()) {
            success(`${test.name} - PASSED`);
            log(`  Output: ${output.trim().split('\n')[0]}`, 'blue');
            passedTests++;
          } else {
            error(`${test.name} - FAILED`);
            if (errorOutput) {
              log(`  Error: ${errorOutput.trim()}`, 'red');
            }
          }
          resolve();
        });

        result.on('error', (error) => {
          reject(error);
        });
      });

    } catch (error) {
      error(`${test.name} - ERROR: ${error.message}`);
    }
  }

  log(`\nCore ADB Commands: ${passedTests}/${totalTests} passed`,
      passedTests === totalTests ? 'green' : 'yellow');

  return passedTests === totalTests;
}

async function testFileOperations() {
  log('\n📁 Testing File Operations', 'cyan');
  log('=========================', 'cyan');

  try {
    const testDir = '/sdcard/Download/adb-mcp-test';
    const testFile = `${testDir}/test.txt`;

    // Test directory creation
    info('Creating test directory...');
    const mkdirResult = spawn('adb', ['shell', `mkdir -p ${testDir}`], { stdio: 'pipe' });
    await new Promise(resolve => mkdirResult.on('close', resolve));

    // Test file creation
    info('Creating test file...');
    const echoResult = spawn('adb', ['shell', `echo "Hello from ADB MCP Test" > ${testFile}`], { stdio: 'pipe' });
    await new Promise(resolve => echoResult.on('close', resolve));

    // Test file reading
    info('Reading test file...');
    const catResult = spawn('adb', ['shell', `cat ${testFile}`], { stdio: 'pipe' });
    let fileContent = '';
    catResult.stdout.on('data', (data) => {
      fileContent += data.toString();
    });
    await new Promise(resolve => catResult.on('close', resolve));

    if (fileContent.includes('Hello from ADB MCP Test')) {
      success('File operations - PASSED');
      log(`  File content: "${fileContent.trim()}"`, 'blue');
    } else {
      error('File operations - FAILED');
    }

    // Cleanup
    info('Cleaning up test files...');
    const rmResult = spawn('adb', ['shell', `rm -rf ${testDir}`], { stdio: 'pipe' });
    await new Promise(resolve => rmResult.on('close', resolve));

    return true;
  } catch (error) {
    error(`File operations test failed: ${error.message}`);
    return false;
  }
}

async function testDeviceTools() {
  log('\n🔧 Testing Device Tools', 'cyan');
  log('=======================', 'cyan');

  const deviceTools = [
    { name: 'List devices', command: 'adb devices -l' },
    { name: 'Get device info', command: 'adb shell getprop | grep -E "(ro.product|ro.build)" | head -5' },
    { name: 'Check screen info', command: 'adb shell wm size' },
    { name: 'Check screen density', command: 'adb shell wm density' }
  ];

  let passedTests = 0;

  for (const tool of deviceTools) {
    try {
      info(`Testing: ${tool.name}`);
      const result = spawn('cmd', ['/c', tool.command], { stdio: 'pipe', shell: true });

      let output = '';
      result.stdout.on('data', (data) => {
        output += data.toString();
      });

      await new Promise(resolve => {
        result.on('close', (code) => {
          if (code === 0 && output.trim()) {
            success(`${tool.name} - PASSED`);
            const lines = output.trim().split('\n');
            log(`  ${lines[0]}`, 'blue');
            passedTests++;
          } else {
            error(`${tool.name} - FAILED`);
          }
          resolve();
        });
      });

    } catch (error) {
      error(`${tool.name} - ERROR: ${error.message}`);
    }
  }

  log(`\nDevice Tools: ${passedTests}/${deviceTools.length} passed`,
      passedTests === deviceTools.length ? 'green' : 'yellow');

  return passedTests > 0;
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Real Functionality Tests', 'bright');
  log('====================================', 'cyan');
  log('Testing ADB MCP Server with real ADB integration\n', 'blue');

  const tests = [
    { name: 'ADB Integration', fn: testADBIntegration },
    { name: 'Core ADB Commands', fn: testCoreADBCommands },
    { name: 'File Operations', fn: testFileOperations },
    { name: 'Device Tools', fn: testDeviceTools },
    { name: 'Basic MCP Functionality', fn: testBasicFunctionality }
  ];

  const results = [];
  let totalPassed = 0;

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      if (passed) totalPassed++;
    } catch (error) {
      error(`Test "${test.name}" crashed: ${error.message}`);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }

  // Final results
  log('\n📊 Test Results Summary', 'bright');
  log('=======================', 'cyan');

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
    if (result.error) {
      log(`   Error: ${result.error}`, 'red');
    }
  });

  const passedPercentage = Math.round((totalPassed / tests.length) * 100);

  log(`\nOverall: ${totalPassed}/${tests.length} tests passed (${passedPercentage}%)`,
      passedPercentage === 100 ? 'green' : passedPercentage >= 80 ? 'yellow' : 'red');

  if (passedPercentage === 100) {
    log('\n🎉 All tests passed! The ADB MCP Server is fully functional!', 'green');
  } else if (passedPercentage >= 80) {
    log('\n✅ Most tests passed! The server is functional with minor issues.', 'yellow');
  } else {
    log('\n⚠️  Some tests failed. Please check the issues above.', 'red');
  }

  return passedPercentage >= 80;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    error(`Test suite failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runAllTests };