const { spawn } = require('child_process');
const readline = require('readline');

class ProperMCPTestClient {
  constructor() {
    this.server = null;
    this.requestId = 1;
    this.responses = new Map();
    this.isInitialized = false;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      this.server.on('error', reject);

      const rl = readline.createInterface({
        input: this.server.stdout,
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            this.responses.set(response.id, response);
            console.log('📥 服务器响应:', JSON.stringify(response, null, 2));
          } catch (e) {
            console.log('📝 服务器日志:', line.trim());
          }
        }
      });

      this.server.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        console.log('🔧 服务器状态:', msg);
        if (msg.includes('ADB MCP Server running on stdio')) {
          setTimeout(resolve, 500);
        }
      });

      setTimeout(() => reject(new Error('启动超时')), 10000);
    });
  }

  async initialize() {
    console.log('\n🔄 初始化 MCP 连接');
    console.log('===================');

    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });

    if (response.result) {
      this.isInitialized = true;
      console.log('✅ MCP 初始化成功');
      return true;
    } else {
      console.log('❌ MCP 初始化失败');
      return false;
    }
  }

  async listTools() {
    console.log('\n📋 获取工具列表');
    console.log('=================');

    const response = await this.sendRequest('tools/list', {});

    if (response.result && response.result.tools) {
      console.log(`✅ 找到 ${response.result.tools.length} 个工具:`);
      response.result.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
      return response.result.tools;
    } else {
      console.log('❌ 获取工具列表失败');
      return [];
    }
  }

  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    const requestStr = JSON.stringify(request) + '\n';
    console.log(`📤 发送请求: ${method}`);

    return new Promise((resolve, reject) => {
      this.server.stdin.write(requestStr);

      const timeout = setTimeout(() => {
        reject(new Error('请求超时'));
      }, 10000);

      const checkResponse = () => {
        const response = this.responses.get(request.id - 1);
        if (response) {
          clearTimeout(timeout);
          resolve(response);
        } else {
          setTimeout(checkResponse, 50);
        }
      };

      checkResponse();
    });
  }

  async callTool(toolName, args = {}) {
    console.log(`\n🔧 调用工具: ${toolName}`);
    console.log('===================');

    const response = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args
    });

    if (response.result && response.result.content) {
      const result = JSON.parse(response.result.content[0].text);
      if (result.success) {
        console.log(`✅ 工具 ${toolName} 执行成功`);
        return result;
      } else {
        console.log(`❌ 工具 ${toolName} 执行失败: ${result.error}`);
        return result;
      }
    } else {
      console.log(`❌ 工具 ${toolName} 调用异常`);
      return null;
    }
  }

  async stop() {
    if (this.server) {
      this.server.kill('SIGTERM');
      return new Promise((resolve) => {
        this.server.on('close', resolve);
        setTimeout(() => {
          this.server.kill('SIGKILL');
          resolve();
        }, 3000);
      });
    }
  }
}

// 测试用例
async function runProperMCPTests() {
  console.log('🚀 开始标准 MCP 测试');
  console.log('===================');

  const client = new ProperMCPTestClient();

  try {
    // 1. 启动服务器
    await client.start();

    // 2. 初始化连接
    const initialized = await client.initialize();
    if (!initialized) {
      throw new Error('MCP 初始化失败');
    }

    // 3. 获取工具列表
    const tools = await client.listTools();
    if (tools.length === 0) {
      throw new Error('没有找到可用工具');
    }

    // 4. 测试设备工具
    console.log('\n📱 测试设备工具');
    console.log('================');

    const listDevicesResult = await client.callTool('list_devices', {});
    if (listDevicesResult && listDevicesResult.success) {
      const devices = listDevicesResult.data.devices;
      console.log(`✅ 找到 ${devices.length} 个设备`);

      if (devices.length > 0) {
        const deviceId = devices[0].id;

        // 测试获取设备信息
        const deviceInfoResult = await client.callTool('get_device_info', { deviceId });
        if (deviceInfoResult && deviceInfoResult.success) {
          console.log('✅ 设备信息获取成功');
        }
      }
    }

    // 5. 测试 Shell 工具
    console.log('\n🐚 测试 Shell 工具');
    console.log('=================');

    const shellResult = await client.callTool('execute_shell', {
      command: 'echo "MCP Test Successful"'
    });
    if (shellResult && shellResult.success) {
      console.log('✅ Shell 命令执行成功');
    }

    // 6. 测试文件工具
    console.log('\n📁 测试文件工具');
    console.log('=================');

    const listFilesResult = await client.callTool('list_files', {
      path: '/sdcard/Download'
    });
    if (listFilesResult && listFilesResult.success) {
      console.log('✅ 文件列表获取成功');
    }

    // 7. 测试媒体工具
    console.log('\n📸 测试媒体工具');
    console.log('=================');

    const screenInfoResult = await client.callTool('get_screen_info', {});
    if (screenInfoResult && screenInfoResult.success) {
      console.log('✅ 屏幕信息获取成功');
    }

    console.log('\n🎉 MCP 测试完成！');
    console.log('================');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await client.stop();
  }
}

// 运行测试
if (require.main === module) {
  runProperMCPTests().catch(console.error);
}

module.exports = { runProperMCPTests };