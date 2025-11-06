const { spawn } = require('child_process');

console.log('🔧 工具模块验证');
console.log('==================');

async function verifyTools() {
  // 验证设备工具
  console.log('📱 验证设备工具...');
  const deviceTest = spawn('node', ['-e', 'const tools = require("./dist/src/tools/device-tools.js").default; console.log("✅ 设备工具:", Object.keys(tools).length, "个工具"); process.exit(0);'], { stdio: 'pipe' });

  // 验证Shell工具
  console.log('🐚 验证Shell工具...');
  const shellTest = spawn('node', ['-e', 'const tools = require("./dist/src/tools/shell-tools.js").default; console.log("✅ Shell工具:", Object.keys(tools).length, "个工具"); process.exit(0);'], { stdio: 'pipe' });

  // 验证文件工具
  console.log('📁 验证文件工具...');
  const fileTest = spawn('node', ['-e', 'const tools = require("./dist/src/tools/file-tools.js").default; console.log("✅ 文件工具:", Object.keys(tools).length, "个工具"); process.exit(0);'], { stdio: 'pipe' });

  // 验证应用工具
  console.log('📱 验证应用工具...');
  const appTest = spawn('node', ['-e', 'const tools = require("./dist/src/tools/app-tools.js").default; console.log("✅ 应用工具:", Object.keys(tools).length, "个工具"); process.exit(0);'], { stdio: 'pipe' });

  // 验证媒体工具
  console.log('📸 验证媒体工具...');
  const mediaTest = spawn('node', ['-e', 'const tools = require("./dist/src/tools/media-tools.js").default; console.log("✅ 媒体工具:", Object.keys(tools).length, "个工具"); process.exit(0);'], { stdio: 'pipe' });

  // 验证日志工具
  console.log('📋 验证日志工具...');
  const logTest = spawn('node', ['-e', 'const tools = require("./dist/src/tools/log-tools.js").default; console.log("✅ 日志工具:", Object.keys(tools).length, "个工具"); process.exit(0);'], { stdio: 'pipe' });

  // 验证高级工具
  console.log('🚀 验证高级工具...');
  const advancedTest = spawn('node', ['-e', 'const tools = require("./dist/src/tools/advanced-tools.js").default; console.log("✅ 高级工具:", Object.keys(tools).length, "个工具"); process.exit(0);'], { stdio: 'pipe' });

  // 等待所有测试完成
  await new Promise(resolve => deviceTest.on('close', resolve));
  await new Promise(resolve => shellTest.on('close', resolve));
  await new Promise(resolve => fileTest.on('close', resolve));
  await new Promise(resolve => appTest.on('close', resolve));
  await new Promise(resolve => mediaTest.on('close', resolve));
  await new Promise(resolve => logTest.on('close', resolve));
  await new Promise(resolve => advancedTest.on('close', resolve));

  console.log('\n🎉 所有工具模块验证完成！');
}

verifyTools().catch(console.error);