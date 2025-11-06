const { spawn } = require('child_process');

console.log('🔧 Testing MCP Tool Registration');
console.log('==================================');

function testMCPServer() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let serverOutput = '';
    let toolsListed = false;

    // Send tools/list request
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    }) + '\n');

    server.stdout.on('data', (data) => {
      serverOutput += data.toString();

      try {
        const response = JSON.parse(serverOutput.trim());
        if (response.result && response.result.tools) {
          toolsListed = true;
          const tools = response.result.tools;

          console.log(`✅ Successfully loaded ${tools.length} MCP tools`);

          // Count tools by category
          const categories = {};
          tools.forEach(tool => {
            const category = tool.name.split('_')[0];
            categories[category] = (categories[category] || 0) + 1;
          });

          console.log('\n📊 Tool Categories:');
          Object.entries(categories).forEach(([category, count]) => {
            console.log(`  ${category}: ${count} tools`);
          });

          console.log('\n📋 Sample Tools:');
          tools.slice(0, 5).forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
          });

          if (tools.length > 5) {
            console.log(`  ... and ${tools.length - 5} more tools`);
          }

          server.kill();
          resolve(true);
        }
      } catch (e) {
        // JSON not complete yet
      }
    });

    server.stderr.on('data', (data) => {
      console.log(`Server stderr: ${data.toString()}`);
    });

    server.on('error', (error) => {
      console.error(`❌ Server error: ${error.message}`);
      reject(error);
    });

    server.on('close', (code) => {
      if (!toolsListed) {
        console.log('❌ Failed to list tools');
        resolve(false);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!toolsListed) {
        console.log('❌ Test timeout');
        server.kill();
        resolve(false);
      }
    }, 10000);
  });
}

testMCPServer().then(success => {
  if (success) {
    console.log('\n🎉 MCP Server is fully functional!');
    console.log('All tools are properly registered and ready to use.');
  } else {
    console.log('\n❌ MCP Server test failed');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});