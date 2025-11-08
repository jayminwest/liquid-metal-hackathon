/**
 * MCP Runner
 * Dynamically loads and executes user MCP servers
 */

import { MCPStorageService } from '../../shared/services/mcpStorage';
import type { MCPClientConfig } from '../../shared/types';

export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * MCP Runner Service
 * Handles loading and execution of user-specific MCP servers
 */
export class MCPRunner {
  private mcpStorage: MCPStorageService;
  private serverCache: Map<string, any> = new Map();

  constructor(config: MCPClientConfig) {
    this.mcpStorage = new MCPStorageService(config);
  }

  /**
   * Execute a tool from a user's MCP server
   */
  async executeTool(
    userId: string,
    request: ToolExecutionRequest
  ): Promise<ToolExecutionResult> {
    try {
      // Load user's MCP server
      const server = await this.loadUserServer(userId);

      // Get credentials
      const credentials = await this.loadCredentials(userId);

      // Execute the tool
      const result = await server.executeTool(request.toolName, request.parameters, credentials);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error(`[MCPRunner] Tool execution failed for ${userId}:`, error);
      return {
        success: false,
        error: error.message || 'Tool execution failed',
      };
    }
  }

  /**
   * Load and initialize a user's MCP server
   * Uses caching to avoid reloading on every request
   */
  private async loadUserServer(userId: string): Promise<any> {
    // Check cache first
    const cached = this.serverCache.get(userId);
    if (cached) {
      return cached;
    }

    // Load server code from storage
    const serverCode = await this.mcpStorage.getServerCode(userId);
    if (!serverCode) {
      throw new Error('No MCP server found for user');
    }

    // Parse and instantiate the server
    // NOTE: In a production environment, this should be sandboxed
    // For hackathon: we trust the agent-generated code
    const server = await this.instantiateServer(serverCode);

    // Cache the server
    this.serverCache.set(userId, server);

    return server;
  }

  /**
   * Load credentials for a user's MCP server
   */
  private async loadCredentials(userId: string): Promise<Record<string, any>> {
    try {
      const credentials = await this.mcpStorage.getCredentials(userId);
      return credentials || {};
    } catch (error) {
      console.warn(`[MCPRunner] No credentials found for ${userId}`);
      return {};
    }
  }

  /**
   * Instantiate an MCP server from code
   *
   * HACKATHON NOTE: This uses eval/Function which is NOT safe for production.
   * For production, implement proper sandboxing (e.g., VM2, isolated worker threads).
   */
  private async instantiateServer(serverCode: string): Promise<any> {
    // Create a module-like environment
    const moduleEnv = {
      exports: {},
      require: (mod: string) => {
        // Provide minimal require support for common modules
        // In production, use a proper module loader
        if (mod === '@modelcontextprotocol/sdk/server/index.js') {
          // Return mock for now - in real implementation, load actual SDK
          return { Server: class MockServer {} };
        }
        throw new Error(`Module not available: ${mod}`);
      },
      console,
    };

    // Wrap the server code in a function to create scope
    const wrappedCode = `
      (function(exports, require, console) {
        ${serverCode}

        // Return an interface to interact with the server
        return {
          executeTool: async function(toolName, params, credentials) {
            // Find and execute the handler
            const handlerName = 'handle' + toolName.split(/[-_]/).map(w =>
              w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
            ).join('');

            if (typeof this[handlerName] === 'function') {
              const result = await this[handlerName](params, credentials);
              return result;
            }

            throw new Error('Tool handler not found: ' + toolName);
          }
        };
      })
    `;

    try {
      // Execute the wrapped code
      const factory = eval(wrappedCode);
      const serverInterface = factory(moduleEnv.exports, moduleEnv.require, moduleEnv.console);
      return serverInterface;
    } catch (error: any) {
      console.error('[MCPRunner] Server instantiation failed:', error);
      throw new Error(`Failed to load MCP server: ${error.message}`);
    }
  }

  /**
   * Clear server cache for a user
   * Call this after updating a user's MCP server
   */
  clearCache(userId: string): void {
    this.serverCache.delete(userId);
  }

  /**
   * Clear all cached servers
   */
  clearAllCaches(): void {
    this.serverCache.clear();
  }

  /**
   * List available tools in a user's MCP server
   */
  async listTools(userId: string): Promise<string[]> {
    try {
      const metadata = await this.mcpStorage.getMetadata(userId);
      return metadata?.tools || [];
    } catch (error) {
      console.error(`[MCPRunner] Failed to list tools for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get tool definition/schema from user's MCP server
   */
  async getToolDefinition(userId: string, toolName: string): Promise<any> {
    try {
      // For now, this is stored in metadata
      // In a more complete implementation, we'd parse the server code
      const metadata = await this.mcpStorage.getMetadata(userId);
      const toolDefs = metadata?.toolDefinitions || {};
      return toolDefs[toolName] || null;
    } catch (error) {
      console.error(`[MCPRunner] Failed to get tool definition:`, error);
      return null;
    }
  }
}

/**
 * Simplified server execution (alternative approach)
 * For hackathon: directly execute tool logic without full MCP server instantiation
 */
export class SimplifiedMCPRunner {
  private mcpStorage: MCPStorageService;

  constructor(config: MCPClientConfig) {
    this.mcpStorage = new MCPStorageService(config);
  }

  /**
   * Execute a tool by extracting and running just the handler function
   */
  async executeTool(
    userId: string,
    request: ToolExecutionRequest
  ): Promise<ToolExecutionResult> {
    try {
      // Load server code
      const serverCode = await this.mcpStorage.getServerCode(userId);
      if (!serverCode) {
        throw new Error('No MCP server found');
      }

      // Load credentials
      const credentials = await this.mcpStorage.getCredentials(userId);

      // Extract and execute the specific handler
      const result = await this.executeHandler(
        serverCode,
        request.toolName,
        request.parameters,
        credentials || {}
      );

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error(`[SimplifiedMCPRunner] Execution failed:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract and execute a specific handler function from server code
   */
  private async executeHandler(
    serverCode: string,
    toolName: string,
    params: Record<string, any>,
    credentials: Record<string, any>
  ): Promise<any> {
    // Convert tool name to handler function name (e.g., read-channel -> handleReadChannel)
    const pascalCase = toolName
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
    const handlerName = `handle${pascalCase}`;

    // Extract the handler function from server code
    const handlerRegex = new RegExp(
      `async function ${handlerName}\\([^)]*\\)\\s*\\{[\\s\\S]*?^\\}`,
      'm'
    );
    const match = serverCode.match(handlerRegex);
    if (!match) {
      throw new Error(`Handler function not found: ${handlerName}`);
    }

    const handlerCode = match[0];

    // Create execution environment
    const executeCode = `
      ${handlerCode}

      // Execute the handler
      (async () => {
        const args = ${JSON.stringify(params)};
        const creds = ${JSON.stringify(credentials)};
        return await ${handlerName}(args, creds);
      })()
    `;

    try {
      const result = await eval(executeCode);
      return result;
    } catch (error: any) {
      throw new Error(`Handler execution failed: ${error.message}`);
    }
  }
}
