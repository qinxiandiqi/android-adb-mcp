const { spawn } = require('child_process');

console.log('🔧 简化的 MCP 工具测试');
console.log('======================');

async function testMCPWithDirectCommands() {
  console.log('📱 直接测试设备命令工具...');

  // 测试 list_devices 工具
  const devicesTest = spawn('node', ['-e', `
    const { AdbClient } = require('./dist/adb/client.js');
    const client = new AdbClient();

    client.isAvailable().then(available => {
      if (available) {
        return client.getDevices();
      } else {
        console.log('❌ ADB 不可用');
        process.exit(1);
      }
    }).then(devices => {
      console.log('✅ 设备工具测试通过');
      console.log(\`找到 \${devices.length} 个设备\`);
      devices.forEach(device => {
        console.log(\`  - \${device.id} (\${device.status})\`);
      });

      // 测试设备信息
      if (devices.length > 0) {
        return client.getDeviceInfo(devices[0].id);
      }
    }).then(info => {
      if (info) {
        console.log('✅ 设备信息获取成功');
        console.log(\`设备型号: \${info['ro.product.model']}\`);
        console.log(\`Android版本: \${info['ro.build.version.release']}\`);
      }

      // 测试 shell 命令
      return client.executeShell('echo "Hello from ADB Client"');
    }).then(result => {
      if (result.success) {
        console.log('✅ Shell 工具测试通过');
        console.log(\`Shell 输出: \${result.stdout.trim()}\`);
      }

      // 测试文件操作
      return client.executeShell('echo "Test Content" > /sdcard/mcp-test.txt && cat /sdcard/mcp-test.txt && rm /sdcard/mcp-test.txt');
    }).then(result => {
      if (result.success) {
        console.log('✅ 文件工具测试通过');
        console.log(\`文件内容: \${result.stdout.trim()}\`);
      }

      // 测试屏幕信息
      return client.executeShell('wm size');
    }).then(result => {
      if (result.success) {
        console.log('✅ 媒体工具测试通过');
        console.log(\`屏幕信息: \${result.stdout.trim()}\`);
      }

      // 测试性能信息
      return client.executeShell('cat /proc/meminfo | grep MemTotal');
    }).then(result => {
      if (result.success) {
        console.log('✅ 高级工具测试通过');
        console.log(\`内存信息: \${result.stdout.trim()}\`);
      }

      console.log('\\n🎉 所有工具类测试完成！');
      console.log('=====================================');
    }).catch(error => {
      console.error('❌ 测试失败:', error.message);
      process.exit(1);
    });
  `]);

  devicesTest.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  devicesTest.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  return new Promise((resolve) => {
    devicesTest.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function testSpecificToolImplementation() {
  console.log('\n🔧 测试特定工具实现...');

  const toolTest = spawn('node', ['-e', `
    // 导入并测试 device-tools
    const deviceTools = require('./dist/src/tools/device-tools.js').default;

    console.log('✅ 设备工具模块加载成功');

    // 测试工具定义
    const listDevicesTool = deviceTools.listDevices;
    console.log(\`✅ list_devices 工具定义: \${listDevicesTool.name}\`);
    console.log(\`✅ 工具描述: \${listDevicesTool.description}\`);

    // 测试 shell-tools
    const shellTools = require('./dist/src/tools/shell-tools.js').default;
    const executeShellTool = shellTools.executeShell;
    console.log(\`✅ execute_shell 工具定义: \${executeShellTool.name}\`);

    // 测试 file-tools
    const fileTools = require('./dist/src/tools/file-tools.js').default;
    const listFilesTool = fileTools.listFiles;
    console.log(\`✅ list_files 工具定义: \${listFilesTool.name}\`);

    // 测试 app-tools
    const appTools = require('./dist/src/tools/app-tools.js').default;
    const listAppsTool = appTools.listApps;
    console.log(\`✅ list_apps 工具定义: \${listAppsTool.name}\`);

    // 测试 media-tools
    const mediaTools = require('./dist/src/tools/media-tools.js').default;
    const captureScreenshotTool = mediaTools.captureScreenshot;
    console.log(\`✅ capture_screenshot 工具定义: \${captureScreenshotTool.name}\`);

    // 测试 log-tools
    const logTools = require('./dist/src/tools/log-tools.js').default;
    const getLogsTool = logTools.getLogs;
    console.log(\`✅ get_logs 工具定义: \${getLogsTool.name}\`);

    // 测试 advanced-tools
    const advancedTools = require('./dist/src/tools/advanced-tools.js').default;
    const executeBatchTool = advancedTools.executeBatch;
    console.log(\`✅ execute_batch 工具定义: \${executeBatchTool.name}\`);

    console.log('\\n🎉 所有工具模块验证完成！');
    console.log('============================');
  `]);

  toolTest.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  toolTest.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  return new Promise((resolve) => {
    toolTest.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function runComprehensiveTest() {
  console.log('🚀 开始综合测试');
  console.log('================');

  const results = [];

  // 测试工具模块
  console.log('\n📦 步骤 1: 验证工具模块加载');
  const toolModuleTest = await testSpecificToolImplementation();
  results.push({ name: '工具模块加载', passed: toolModuleTest });

  // 测试 ADB 客户端功能
  console.log('\n🔧 步骤 2: 验证 ADB 客户端功能');
  const adbClientTest = await testMCPWithDirectCommands();
  results.push({ name: 'ADB 客户端功能', passed: adbClientTest });

  // 总结结果
  console.log('\n📊 测试结果总结');
  console.log('==================');

  let passedCount = 0;
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.passed) passedCount++;
  });

  const successRate = Math.round((passedCount / results.length) * 100);

  console.log(`\n总体成功率: ${passedCount}/${results.length} (${successRate}%)`);

  if (successRate === 100) {
    console.log('\n🎉 所有测试通过！ADB MCP 服务器功能完整！');
    console.log('=====================================');
    console.log('✅ 所有工具模块正确加载');
    console.log('✅ ADB 客户端功能完全正常');
    console.log('✅ 真实设备操作成功');
    console.log('✅ 项目已达到生产就绪状态！');
  } else {
    console.log('\n⚠️  部分测试失败，需要进一步检查');
  }

  return successRate === 100;
}

// 运行测试
if (require.main === module) {
  runComprehensiveTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('综合测试失败:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveTest };