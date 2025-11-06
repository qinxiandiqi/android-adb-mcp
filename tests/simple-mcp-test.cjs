const { spawn } = require('child_process');

console.log('🔍 简单 MCP 诊断测试');
console.log('====================');

// 启动 MCP 服务器
const server = spawn('node', ['dist/src/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let serverStarted = false;
let responseBuffer = '';

server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  console.log('🔧 服务器:', msg);
  if (msg.includes('ADB MCP Server running on stdio')) {
    serverStarted = true;
    console.log('✅ 服务器已启动，开始测试');

    // 等待一秒后发送初始化请求
    setTimeout(() => {
      console.log('\n📤 发送初始化请求...');
      const initRequest = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      }) + '\n';
      server.stdin.write(initRequest);
    }, 1000);
  }
});

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  console.log('📥 收到数据:', data.toString().trim());

  // 尝试解析响应
  try {
    const lines = responseBuffer.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const response = JSON.parse(line);
        console.log('✅ 解析成功:', JSON.stringify(response, null, 2));

        if (response.id === 1 && response.result) {
          console.log('\n📤 发送工具列表请求...');
          const toolsRequest = JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
          }) + '\n';
          server.stdin.write(toolsRequest);
        }

        if (response.id === 2 && response.result) {
          console.log('\n📤 发送工具调用请求...');
          const toolRequest = JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'list_devices',
              arguments: {}
            }
          }) + '\n';
          server.stdin.write(toolRequest);
        }

        if (response.id === 3) {
          console.log('\n🎉 测试完成，关闭服务器');
          server.kill('SIGTERM');
        }
      }
    }
  } catch (e) {
    console.log('⚠️  JSON 解析失败:', e.message);
  }
});

server.on('error', (error) => {
  console.error('❌ 服务器错误:', error.message);
});

server.on('close', (code) => {
  console.log(`🔚 服务器退出，代码: ${code}`);
  process.exit(code === 0 ? 0 : 1);
});

// 超时处理
setTimeout(() => {
  if (!serverStarted) {
    console.error('❌ 服务器启动超时');
    server.kill('SIGKILL');
    process.exit(1);
  }
}, 10000);

setTimeout(() => {
  console.log('❌ 测试超时');
  server.kill('SIGKILL');
  process.exit(1);
}, 30000);