const { spawn } = require('child_process');

console.log('🔧 通过 ADB MCP 服务器测试真实工具功能');
console.log('==========================================');

class MCPClient {
  constructor() {
    this.server = null;
    this.requestId = 1;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['dist/src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let serverOutput = '';

      this.server.stderr.on('data', (data) => {
        serverOutput += data.toString();
        if (serverOutput.includes('ADB MCP Server running on stdio')) {
          console.log('✅ MCP 服务器已启动');
          resolve();
        }
      });

      this.server.on('error', (error) => {
        console.error(`❌ 服务器启动失败: ${error.message}`);
        reject(error);
      });

      this.server.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`❌ 服务器退出，代码: ${code}`);
        }
      });

      setTimeout(() => {
        if (!serverOutput.includes('ADB MCP Server running on stdio')) {
          reject(new Error('服务器启动超时'));
        }
      }, 5000);
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

      let responseBuffer = '';

      const timeout = setTimeout(() => {
        reject(new Error('请求超时'));
      }, 10000);

      this.server.stdout.on('data', (data) => {
        responseBuffer += data.toString();

        try {
          const lines = responseBuffer.trim().split('\n');
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
          // 忽略不完整的 JSON
        }
      });

      this.server.stdin.write(requestStr);
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

async function testDeviceTools() {
  console.log('\n📱 测试设备工具');
  console.log('==================');

  const client = new MCPClient();
  await client.start();

  try {
    // 测试列出设备
    console.log('🔍 测试: list_devices');
    const devicesResult = await client.sendRequest('tools/call', {
      name: 'list_devices',
      arguments: {}
    });

    if (devicesResult.result && devicesResult.result.content) {
      const data = JSON.parse(devicesResult.result.content[0].text);
      if (data.success) {
        console.log(`✅ 找到 ${data.data.count} 个设备`);
        data.data.devices.forEach(device => {
          console.log(`  - ${device.id} (${device.status})`);
        });
      } else {
        console.log('❌ 列出设备失败');
        return false;
      }
    }

    // 获取第一个设备ID进行后续测试
    const devicesResult2 = await client.sendRequest('tools/call', {
      name: 'list_devices',
      arguments: {}
    });
    const devicesData = JSON.parse(devicesResult2.result.content[0].text);

    if (devicesData.data.devices.length === 0) {
      console.log('⚠️  没有连接的设备，跳过其他设备测试');
      await client.stop();
      return true;
    }

    const deviceId = devicesData.data.devices[0].id;

    // 测试获取设备信息
    console.log('📊 测试: get_device_info');
    const deviceInfoResult = await client.sendRequest('tools/call', {
      name: 'get_device_info',
      arguments: { deviceId }
    });

    if (deviceInfoResult.result) {
      const infoData = JSON.parse(deviceInfoResult.result.content[0].text);
      if (infoData.success) {
        console.log('✅ 设备信息获取成功');
        console.log(`  设备: ${infoData.data.device.model}`);
      } else {
        console.log('❌ 获取设备信息失败');
      }
    }

    // 测试检查设备状态
    console.log('🔍 测试: check_device_status');
    const statusResult = await client.sendRequest('tools/call', {
      name: 'check_device_status',
      arguments: { deviceId }
    });

    if (statusResult.result) {
      const statusData = JSON.parse(statusResult.result.content[0].text);
      if (statusData.success) {
        console.log(`✅ 设备状态: ${statusData.data.status}`);
      }
    }

  } catch (error) {
    console.error(`❌ 设备工具测试失败: ${error.message}`);
    await client.stop();
    return false;
  }

  await client.stop();
  return true;
}

async function testShellTools() {
  console.log('\n🐚 测试 Shell 工具');
  console.log('==================');

  const client = new MCPClient();
  await client.start();

  try {
    // 测试获取系统属性
    console.log('📋 测试: get_system_properties');
    const propsResult = await client.sendRequest('tools/call', {
      name: 'get_system_properties',
      arguments: { property: 'ro.product.model' }
    });

    if (propsResult.result) {
      const propsData = JSON.parse(propsResult.result.content[0].text);
      if (propsData.success) {
        const model = propsData.data.properties['ro.product.model'];
        console.log(`✅ 设备型号: ${model}`);
      } else {
        console.log('❌ 获取系统属性失败');
      }
    }

    // 测试执行安全命令
    console.log('💻 测试: execute_shell');
    const shellResult = await client.sendRequest('tools/call', {
      name: 'execute_shell',
      arguments: { command: 'echo "Hello from MCP Shell"' }
    });

    if (shellResult.result) {
      const shellData = JSON.parse(shellResult.result.content[0].text);
      if (shellData.success) {
        console.log(`✅ Shell 命令执行: ${shellData.data.stdout.trim()}`);
      } else {
        console.log('❌ Shell 命令执行失败');
      }
    }

  } catch (error) {
    console.error(`❌ Shell 工具测试失败: ${error.message}`);
    await client.stop();
    return false;
  }

  await client.stop();
  return true;
}

async function testFileTools() {
  console.log('\n📁 测试文件工具');
  console.log('==================');

  const client = new MCPClient();
  await client.start();

  try {
    const testPath = '/sdcard/Download/mcp-test.txt';

    // 测试列出文件
    console.log('📂 测试: list_files');
    const listResult = await client.sendRequest('tools/call', {
      name: 'list_files',
      arguments: { path: '/sdcard/Download' }
    });

    if (listResult.result) {
      const listData = JSON.parse(listResult.result.content[0].text);
      if (listData.success) {
        console.log(`✅ 找到 ${listData.data.count} 个文件/目录`);
      } else {
        console.log('❌ 列出文件失败');
      }
    }

    // 测试创建文件 (通过 shell 命令)
    console.log('📝 创建测试文件');
    const createResult = await client.sendRequest('tools/call', {
      name: 'execute_shell',
      arguments: { command: `echo "MCP Test File Content" > ${testPath}` }
    });

    if (createResult.result && JSON.parse(createResult.result.content[0].text).success) {
      console.log('✅ 测试文件创建成功');

      // 测试获取文件信息
      console.log('📄 测试: get_file_info');
      const infoResult = await client.sendRequest('tools/call', {
        name: 'get_file_info',
        arguments: { path: testPath }
      });

      if (infoResult.result) {
        const infoData = JSON.parse(infoResult.result.content[0].text);
        if (infoData.success) {
          console.log('✅ 文件信息获取成功');
        } else {
          console.log('❌ 获取文件信息失败');
        }
      }

      // 清理测试文件
      await client.sendRequest('tools/call', {
        name: 'execute_shell',
        arguments: { command: `rm ${testPath}` }
      });
      console.log('🗑️  测试文件已清理');

    } else {
      console.log('❌ 创建测试文件失败');
    }

  } catch (error) {
    console.error(`❌ 文件工具测试失败: ${error.message}`);
    await client.stop();
    return false;
  }

  await client.stop();
  return true;
}

async function testMediaTools() {
  console.log('\n📸 测试媒体工具');
  console.log('==================');

  const client = new MCPClient();
  await client.start();

  try {
    // 测试获取屏幕信息
    console.log('🖥️  测试: get_screen_info');
    const screenResult = await client.sendRequest('tools/call', {
      name: 'get_screen_info',
      arguments: {}
    });

    if (screenResult.result) {
      const screenData = JSON.parse(screenResult.result.content[0].text);
      if (screenData.success) {
        const info = screenData.data.screenInfo;
        console.log(`✅ 屏幕尺寸: ${info.physicalSize}`);
        console.log(`✅ 屏幕密度: ${info.physicalDensity}`);
      } else {
        console.log('❌ 获取屏幕信息失败');
      }
    }

  } catch (error) {
    console.error(`❌ 媒体工具测试失败: ${error.message}`);
    await client.stop();
    return false;
  }

  await client.stop();
  return true;
}

async function testAdvancedTools() {
  console.log('\n🚀 测试高级工具');
  console.log('==================');

  const client = new MCPClient();
  await client.start();

  try {
    // 测试性能监控
    console.log('📊 测试: get_performance_metrics');
    const perfResult = await client.sendRequest('tools/call', {
      name: 'get_performance_metrics',
      arguments: { includeBattery: true }
    });

    if (perfResult.result) {
      const perfData = JSON.parse(perfResult.result.content[0].text);
      if (perfData.success) {
        const metrics = perfData.data.metrics;
        console.log(`✅ CPU 核心数: ${metrics.cpu.cores}`);
        console.log(`✅ 内存总量: ${Math.round(metrics.memory.total / 1024 / 1024)} MB`);
        if (metrics.battery) {
          console.log(`✅ 电池电量: ${metrics.battery.level}%`);
        }
      } else {
        console.log('❌ 获取性能指标失败');
      }
    }

    // 测试批量命令执行
    console.log('⚡ 测试: execute_batch');
    const batchResult = await client.sendRequest('tools/call', {
      name: 'execute_batch',
      arguments: {
        commands: [
          { command: 'shell echo "Command 1"', description: 'First command' },
          { command: 'shell echo "Command 2"', description: 'Second command' }
        ]
      }
    });

    if (batchResult.result) {
      const batchData = JSON.parse(batchResult.result.content[0].text);
      if (batchData.success) {
        console.log(`✅ 批量执行成功: ${batchData.data.successCount}/${batchData.data.totalCommands} 个命令`);
      } else {
        console.log('❌ 批量命令执行失败');
      }
    }

  } catch (error) {
    console.error(`❌ 高级工具测试失败: ${error.message}`);
    await client.stop();
    return false;
  }

  await client.stop();
  return true;
}

// 主测试函数
async function runAllMCPTests() {
  console.log('🚀 开始通过 MCP 服务器测试所有工具');
  console.log('============================');

  const tests = [
    { name: '设备工具', fn: testDeviceTools },
    { name: 'Shell 工具', fn: testShellTools },
    { name: '文件工具', fn: testFileTools },
    { name: '媒体工具', fn: testMediaTools },
    { name: '高级工具', fn: testAdvancedTools }
  ];

  const results = [];
  let totalPassed = 0;

  for (const test of tests) {
    try {
      console.log(`\n========== 开始测试: ${test.name} ==========`);
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      if (passed) {
        totalPassed++;
        console.log(`✅ ${test.name} 测试通过`);
      } else {
        console.log(`❌ ${test.name} 测试失败`);
      }
    } catch (error) {
      console.error(`❌ ${test.name} 测试崩溃: ${error.message}`);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }

  // 最终结果
  console.log('\n📊 MCP 工具测试结果总结');
  console.log('============================');

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? '绿色' : '红色';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });

  const passedPercentage = Math.round((totalPassed / tests.length) * 100);

  console.log(`\n总体结果: ${totalPassed}/${tests.length} 个工具类别测试通过 (${passedPercentage}%)`);

  if (passedPercentage === 100) {
    console.log('\n🎉 所有 MCP 工具测试通过！ADB MCP 服务器功能完全正常！');
  } else if (passedPercentage >= 80) {
    console.log('\n✅ 大部分 MCP 工具测试通过！服务器基本功能正常。');
  } else {
    console.log('\n⚠️  部分 MCP 工具测试失败，需要检查问题。');
  }

  return passedPercentage >= 80;
}

// 运行测试
if (require.main === module) {
  runAllMCPTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('MCP 工具测试套件失败:', error);
    process.exit(1);
  });
}

module.exports = { runAllMCPTests };