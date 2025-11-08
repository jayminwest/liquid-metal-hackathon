/**
 * MCP Server implementation for api/shared
 * Exposes local storage MCP tools via HTTP transport
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Simple in-memory storage (replace with database/file storage later)
const storage = {
  buckets: new Map<string, Map<string, string>>(), // bucket_name -> key -> content
  annotations: new Map<string, any>(), // annotation_id -> annotation
  sessions: new Map<string, any[]>(), // session_id -> memories[]
  smartBuckets: new Set<string>(), // Set of created bucket names
};

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
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'put-object': {
          const { bucket_name, key, content, content_type } = args as any;

          if (!storage.buckets.has(bucket_name)) {
            storage.buckets.set(bucket_name, new Map());
          }

          storage.buckets.get(bucket_name)!.set(key, content);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  key,
                  message: `Object stored in ${bucket_name}/${key}`,
                }),
              },
            ],
          };
        }

        case 'get-object': {
          const { bucket_name, key } = args as any;

          const bucket = storage.buckets.get(bucket_name);
          if (!bucket || !bucket.has(key)) {
            throw new Error(`Object not found: ${bucket_name}/${key}`);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  content: bucket.get(key),
                  key,
                }),
              },
            ],
          };
        }

        case 'delete-object': {
          const { bucket_name, key } = args as any;

          const bucket = storage.buckets.get(bucket_name);
          if (bucket) {
            bucket.delete(key);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Object deleted: ${bucket_name}/${key}`,
                }),
              },
            ],
          };
        }

        case 'list-objects': {
          const { bucket_name, prefix, limit } = args as any;

          const bucket = storage.buckets.get(bucket_name);
          if (!bucket) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ objects: [] }),
                },
              ],
            };
          }

          let keys = Array.from(bucket.keys());
          if (prefix) {
            keys = keys.filter(k => k.startsWith(prefix));
          }
          if (limit) {
            keys = keys.slice(0, limit);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  objects: keys.map(key => ({ key })),
                }),
              },
            ],
          };
        }

        case 'create-smartbucket': {
          const { bucket_name, description, embedding_model } = args as any;

          storage.smartBuckets.add(bucket_name);
          if (!storage.buckets.has(bucket_name)) {
            storage.buckets.set(bucket_name, new Map());
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  bucket_name,
                  message: `SmartBucket created: ${bucket_name}`,
                }),
              },
            ],
          };
        }

        case 'document-search': {
          const { bucket_name, query, limit = 10, threshold = 0.7 } = args as any;

          // Simple keyword search (replace with vector search later)
          const bucket = storage.buckets.get(bucket_name);
          if (!bucket) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ results: [] }),
                },
              ],
            };
          }

          const results: any[] = [];
          const lowerQuery = query.toLowerCase();

          for (const [key, content] of bucket.entries()) {
            if (content.toLowerCase().includes(lowerQuery)) {
              results.push({
                key,
                content,
                score: 0.9, // Mock score
              });
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  results: results.slice(0, limit),
                }),
              },
            ],
          };
        }

        case 'put-annotation': {
          const { annotation_id, content, metadata, tags } = args as any;

          storage.annotations.set(annotation_id, {
            annotation_id,
            content,
            metadata,
            tags,
            created_at: new Date().toISOString(),
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  annotation_id,
                }),
              },
            ],
          };
        }

        case 'get-annotation': {
          const { annotation_id } = args as any;

          const annotation = storage.annotations.get(annotation_id);
          if (!annotation) {
            throw new Error(`Annotation not found: ${annotation_id}`);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(annotation),
              },
            ],
          };
        }

        case 'list-annotations': {
          const { tags, limit = 50, offset = 0 } = args as any;

          let annotations = Array.from(storage.annotations.values());

          if (tags && tags.length > 0) {
            annotations = annotations.filter(a =>
              tags.some((tag: string) => a.tags?.includes(tag))
            );
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  annotations: annotations.slice(offset, offset + limit),
                }),
              },
            ],
          };
        }

        case 'start-session': {
          const session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          storage.sessions.set(session_id, []);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  session_id,
                  created_at: new Date().toISOString(),
                }),
              },
            ],
          };
        }

        case 'put-memory': {
          const { session_id, content, key, timeline, agent } = args as any;

          if (!storage.sessions.has(session_id)) {
            storage.sessions.set(session_id, []);
          }

          const memory = {
            memory_id: `mem_${Date.now()}`,
            content,
            key,
            timeline,
            agent,
            created_at: new Date().toISOString(),
          };

          storage.sessions.get(session_id)!.push(memory);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  memory_id: memory.memory_id,
                  session_id,
                }),
              },
            ],
          };
        }

        case 'get-memory': {
          const { session_id, key, timeline, n_most_recent } = args as any;

          let memories = storage.sessions.get(session_id) || [];

          if (key) {
            memories = memories.filter(m => m.key === key);
          }
          if (timeline) {
            memories = memories.filter(m => m.timeline === timeline);
          }
          if (n_most_recent) {
            memories = memories.slice(-n_most_recent);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  memories,
                  count: memories.length,
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
