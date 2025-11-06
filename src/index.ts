#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

import deviceTools from './tools/device-tools.js';
import shellTools from './tools/shell-tools.js';
import fileTools from './tools/file-tools.js';
import appTools from './tools/app-tools.js';
import mediaTools from './tools/media-tools.js';
import logTools from './tools/log-tools.js';
import advancedTools from './tools/advanced-tools.js';

class AdbMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'adb-mcp',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      console.error('Received SIGINT, shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools = [
        ...Object.values(deviceTools),
        ...Object.values(shellTools),
        ...Object.values(fileTools),
        ...Object.values(appTools),
        ...Object.values(mediaTools),
        ...Object.values(logTools),
        ...Object.values(advancedTools)
      ];

      return {
        tools: allTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Find the tool handler
        const allTools = {
          ...deviceTools,
          ...shellTools,
          ...fileTools,
          ...appTools,
          ...mediaTools,
          ...logTools,
          ...advancedTools
        };

        const tool = allTools[name as keyof typeof allTools];

        if (!tool) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Tool '${name}' not found`
          );
        }

        // Execute the tool handler
        const result = await tool.handler(args as any);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`Error executing tool '${name}':`, error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: errorMessage,
                tool: name,
                arguments: args
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ADB MCP Server running on stdio');
  }
}

// Start the server
const server = new AdbMcpServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
