/**
 * Main API Server
 * Uses Hono for lightweight, fast HTTP routing with Bun
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { captureKnowledge, updateKnowledge, syncRecentChanges } from '@knowledge/sync';
import { queryKnowledge, findRelatedEntities, getRecentKnowledge } from '@knowledge/retrieval';
import { generateKnowledgeGraph, suggestConnections } from '@knowledge/graph';
import type { KnowledgeEntry, QueryRequest } from '@shared/types';
import { createMCPServer } from './shared/mcp-server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const app = new Hono();
const mcpServer = createMCPServer();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'liquid-metal-hackathon',
  });
});

// MCP Server endpoint
app.post('/mcp', async (c) => {
  const body = await c.req.json();

  // Create a new transport for each request
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  // Handle the request
  const response = await new Promise<any>((resolve, reject) => {
    // Create mock request/response objects
    const mockReq = {
      body,
      headers: Object.fromEntries(c.req.raw.headers),
      method: 'POST',
      url: c.req.url,
    };

    const mockRes = {
      chunks: [] as any[],
      statusCode: 200,
      headers: new Map(),

      writeHead(status: number, headers?: any) {
        this.statusCode = status;
        if (headers) {
          Object.entries(headers).forEach(([k, v]) => {
            this.headers.set(k, v);
          });
        }
        return this; // Chain for writeHead().end()
      },

      write(chunk: any) {
        this.chunks.push(chunk);
      },

      end(chunk?: any) {
        if (chunk) this.chunks.push(chunk);
        const body = this.chunks.join('');
        resolve({
          status: this.statusCode,
          headers: Object.fromEntries(this.headers),
          body: body ? JSON.parse(body) : {},
        });
      },

      on() {},
    };

    // Connect and handle request
    mcpServer.connect(transport as any).then(() => {
      (transport as any).handleRequest(mockReq, mockRes, body);
    }).catch(reject);
  });

  return c.json(response.body, response.status);
});

// Knowledge endpoints
const knowledge = new Hono();

// Capture new knowledge
knowledge.post('/capture', async (c) => {
  try {
    const entry: KnowledgeEntry = await c.req.json();
    const sessionId = c.req.header('X-Session-ID') || 'default-session';

    const result = await captureKnowledge(entry, sessionId);

    return c.json(result, result.status === 'success' ? 201 : 500);
  } catch (error) {
    return c.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Query knowledge
knowledge.post('/query', async (c) => {
  try {
    const request: QueryRequest = await c.req.json();

    const result = await queryKnowledge(request);

    return c.json(result);
  } catch (error) {
    return c.json({
      answer: 'Error processing query',
      sources: [],
      related: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Get knowledge graph
knowledge.get('/graph', async (c) => {
  try {
    const tags = c.req.query('tags')?.split(',');
    const entities = c.req.query('entities')?.split(',');

    const graph = await generateKnowledgeGraph({
      tags,
      entities,
    });

    return c.json(graph);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Get suggested connections
knowledge.get('/suggestions', async (c) => {
  try {
    const sessionId = c.req.header('X-Session-ID') || 'default-session';
    const limit = parseInt(c.req.query('limit') || '10');

    const suggestions = await suggestConnections(sessionId, limit);

    return c.json({ suggestions });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Find related entities
knowledge.get('/related/:topic', async (c) => {
  try {
    const topic = c.req.param('topic');
    const sessionId = c.req.header('X-Session-ID') || 'default-session';
    const limit = parseInt(c.req.query('limit') || '5');

    const related = await findRelatedEntities(topic, sessionId, limit);

    return c.json({ related });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Get recent knowledge
knowledge.get('/recent', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');

    const recent = await getRecentKnowledge(limit);

    return c.json({ recent });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Sync recent changes
knowledge.post('/sync', async (c) => {
  try {
    const sessionId = c.req.header('X-Session-ID') || 'default-session';
    const limit = parseInt(c.req.query('limit') || '10');

    const result = await syncRecentChanges(sessionId, limit);

    return c.json(result);
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Mount knowledge routes
app.route('/api/knowledge', knowledge);

// Mount tooling routes
import toolingApp from './tooling/index';
app.route('/api/tools', toolingApp);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    path: c.req.path,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message,
  }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

console.log(`🚀 Server starting on http://${host}:${port}`);
console.log(`📚 Knowledge API: http://${host}:${port}/api/knowledge`);
console.log(`🔧 Tooling API: http://${host}:${port}/api/tooling`);

export default {
  port,
  hostname: host,
  fetch: app.fetch,
};
