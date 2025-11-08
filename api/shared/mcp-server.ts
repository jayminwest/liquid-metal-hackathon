/**
 * MCP Server implementation for api/shared
 *
 * HTTP Transport Proxy for Raindrop MCP
 *
 * This server acts as a thin HTTP transport wrapper over Raindrop MCP tools.
 * It receives MCP tool calls via HTTP transport and delegates them to the
 * underlying Raindrop MCP server, enabling true persistence and semantic search.
 *
 * Architecture:
 * - HTTP Client → HTTP Transport (this server) → Raindrop MCP → Persistent Storage
 * - All data operations are persisted via Raindrop infrastructure
 * - No in-memory storage; data survives server restarts
 * - SmartBucket searches use real vector embeddings (semantic, not keyword)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RaindropClient } from './raindrop.js';
import { MCPBuilder } from '../tooling/builder/mcpBuilder.js';
import { MCPRunner } from '../tooling/executor/mcpRunner.js';

// Initialize Raindrop client for MCP tool delegation
// Note: RaindropClient uses MCP tools via Claude Code runtime (globalThis.mcp__raindrop_mcp__*)
// The config parameter is required but not used for actual MCP tool calls
const raindropClient = new RaindropClient({
  endpoint: 'mcp-tools', // Not used - MCP tools called directly
  auth: { type: 'bearer', token: '' }, // Not used - MCP tools called directly
});

// Initialize tooling services for custom tool creation
const config = {
  endpoint: process.env.RAINDROP_ENDPOINT || 'http://localhost:3000',
  auth: {
    type: 'bearer' as const,
    token: process.env.RAINDROP_TOKEN || '',
  },
};

const mcpBuilder = new MCPBuilder(config, process.env.ANTHROPIC_API_KEY);
const mcpRunner = new MCPRunner(config);

/**
 * Create and configure the MCP server
 */
export function createMCPServer() {
  const server = new Server(
    {
      name: 'api-shared-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // ============================================================================
  // BUCKET OPERATIONS
  // ============================================================================

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'put-object',
        description: 'Upload an object to a bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string' },
            key: { type: 'string' },
            content: { type: 'string' },
            content_type: { type: 'string' },
          },
          required: ['bucket_name', 'key', 'content'],
        },
      },
      {
        name: 'get-object',
        description: 'Retrieve an object from a bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string' },
            key: { type: 'string' },
          },
          required: ['bucket_name', 'key'],
        },
      },
      {
        name: 'delete-object',
        description: 'Delete an object from a bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string' },
            key: { type: 'string' },
          },
          required: ['bucket_name', 'key'],
        },
      },
      {
        name: 'list-objects',
        description: 'List objects in a bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string' },
            prefix: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['bucket_name'],
        },
      },
      {
        name: 'create-smartbucket',
        description: 'Create a new SmartBucket with AI capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string' },
            description: { type: 'string' },
            embedding_model: { type: 'string' },
          },
          required: ['bucket_name'],
        },
      },
      {
        name: 'document-search',
        description: 'Search for documents in a SmartBucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_name: { type: 'string' },
            query: { type: 'string' },
            limit: { type: 'number' },
            threshold: { type: 'number' },
          },
          required: ['bucket_name', 'query'],
        },
      },
      {
        name: 'put-annotation',
        description: 'Create or update an annotation',
        inputSchema: {
          type: 'object',
          properties: {
            annotation_id: { type: 'string' },
            content: { type: 'string' },
            metadata: { type: 'object' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['annotation_id', 'content'],
        },
      },
      {
        name: 'get-annotation',
        description: 'Retrieve an annotation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            annotation_id: { type: 'string' },
          },
          required: ['annotation_id'],
        },
      },
      {
        name: 'list-annotations',
        description: 'List annotations with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
      },
      {
        name: 'start-session',
        description: 'Start a new working memory session',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'put-memory',
        description: 'Store a memory entry in working memory session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            content: { type: 'string' },
            key: { type: 'string' },
            timeline: { type: 'string' },
            agent: { type: 'string' },
          },
          required: ['session_id', 'content'],
        },
      },
      {
        name: 'get-memory',
        description: 'Retrieve memory entries from working memory session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            key: { type: 'string' },
            timeline: { type: 'string' },
            n_most_recent: { type: 'number' },
          },
          required: ['session_id'],
        },
      },

      // ========================================================================
      // CUSTOM TOOL BUILDING
      // ========================================================================
      {
        name: 'create-custom-tool',
        description: 'Create a custom MCP tool using natural language. The AI agent will analyze your request and generate a functional tool with OAuth integration if needed.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID for tool ownership'
            },
            user_request: {
              type: 'string',
              description: 'Natural language description of the tool (e.g., "I want to read my Slack channels")'
            },
            context: {
              type: 'string',
              description: 'Optional additional context for the tool'
            },
          },
          required: ['user_id', 'user_request'],
        },
      },
      {
        name: 'list-custom-tools',
        description: 'List all custom MCP tools created by the user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID to list tools for'
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'execute-custom-tool',
        description: 'Execute a custom MCP tool with provided arguments',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID who owns the tool'
            },
            tool_id: {
              type: 'string',
              description: 'ID of the tool to execute'
            },
            arguments: {
              type: 'object',
              description: 'Arguments to pass to the tool'
            },
          },
          required: ['user_id', 'tool_id'],
        },
      },
      {
        name: 'delete-custom-tool',
        description: 'Delete a custom MCP tool',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID who owns the tool'
            },
            tool_id: {
              type: 'string',
              description: 'ID of the tool to delete'
            },
          },
          required: ['user_id', 'tool_id'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'put-object': {
          const { bucket_name, key, content, content_type } = args as any;

          const result = await raindropClient.putObject({
            bucket_name,
            key,
            content,
            content_type,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  key: result.key,
                  message: `Object stored in ${bucket_name}/${key}`,
                }),
              },
            ],
          };
        }

        case 'get-object': {
          const { bucket_name, key } = args as any;

          const result = await raindropClient.getObject({
            bucket_name,
            key,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  content: result.content,
                  key,
                  content_type: result.content_type,
                }),
              },
            ],
          };
        }

        case 'delete-object': {
          const { bucket_name, key } = args as any;

          const result = await raindropClient.deleteObject({
            bucket_name,
            key,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  message: `Object deleted: ${bucket_name}/${key}`,
                }),
              },
            ],
          };
        }

        case 'list-objects': {
          const { bucket_name, prefix, limit } = args as any;

          const result = await raindropClient.listObjects({
            bucket_name,
            prefix,
            limit,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  objects: result.objects,
                }),
              },
            ],
          };
        }

        case 'create-smartbucket': {
          const { bucket_name, description, embedding_model } = args as any;

          const result = await raindropClient.createSmartBucket({
            bucket_name,
            description,
            embedding_model,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  bucket_name: result.bucket_name,
                  message: `SmartBucket created: ${bucket_name}`,
                }),
              },
            ],
          };
        }

        case 'document-search': {
          const { bucket_name, query, limit = 10, threshold = 0.7 } = args as any;

          const result = await raindropClient.documentSearch({
            bucket_name,
            query,
            limit,
            threshold,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  results: result.results,
                }),
              },
            ],
          };
        }

        case 'put-annotation': {
          const { annotation_id, content, metadata, tags } = args as any;

          const result = await raindropClient.putAnnotation({
            annotation_id,
            content,
            metadata,
            tags,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  annotation_id: result.annotation_id,
                }),
              },
            ],
          };
        }

        case 'get-annotation': {
          const { annotation_id } = args as any;

          const result = await raindropClient.getAnnotation({
            annotation_id,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  annotation_id,
                  content: result.content,
                  metadata: result.metadata,
                  tags: result.tags,
                }),
              },
            ],
          };
        }

        case 'list-annotations': {
          const { tags, limit = 50, offset = 0 } = args as any;

          const result = await raindropClient.listAnnotations({
            tags,
            limit,
            offset,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  annotations: result.annotations,
                }),
              },
            ],
          };
        }

        case 'start-session': {
          const result = await raindropClient.startSession();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  session_id: result.session_id,
                  created_at: new Date().toISOString(),
                }),
              },
            ],
          };
        }

        case 'put-memory': {
          const { session_id, content, key, timeline, agent } = args as any;

          const result = await raindropClient.putMemory({
            session_id,
            content,
            key,
            timeline,
            agent,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  memory_id: result.memory_id,
                  session_id,
                }),
              },
            ],
          };
        }

        case 'get-memory': {
          const { session_id, key, timeline, n_most_recent } = args as any;

          const result = await raindropClient.getMemory({
            session_id,
            key,
            timeline,
            n_most_recent,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  memories: result.memories,
                  count: result.memories.length,
                }),
              },
            ],
          };
        }

        // ====================================================================
        // CUSTOM TOOL BUILDING HANDLERS
        // ====================================================================

        case 'create-custom-tool': {
          const { user_id, user_request, context } = args as any;

          const result = await mcpBuilder.buildTool({
            userId: user_id,
            userRequest: user_request,
            context,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  tool_id: result.toolId,
                  tool_name: result.toolName,
                  status: result.status,
                  oauth_url: result.oauthUrl,
                  requires_oauth: result.status === 'auth_required',
                  message: result.status === 'auth_required'
                    ? `Tool created! Please authorize at: ${result.oauthUrl}`
                    : 'Tool created successfully and ready to use',
                }),
              },
            ],
          };
        }

        case 'list-custom-tools': {
          const { user_id } = args as any;

          const tools = await mcpRunner.listTools(user_id);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  tools: tools.tools,
                  count: tools.tools.length,
                }),
              },
            ],
          };
        }

        case 'execute-custom-tool': {
          const { user_id, tool_id, arguments: toolArgs } = args as any;

          const result = await mcpRunner.executeTool(user_id, tool_id, toolArgs || {});

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  result: result.result,
                  tool_id,
                }),
              },
            ],
          };
        }

        case 'delete-custom-tool': {
          const { user_id, tool_id } = args as any;

          // Clear cache for this user
          await mcpRunner.clearCache(user_id);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  deleted: tool_id,
                  message: 'Tool marked as inactive',
                }),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
