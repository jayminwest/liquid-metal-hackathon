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

const app = new Hono();

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

// File upload endpoint
knowledge.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) {
      return c.json({
        status: 'error',
        error: 'No file provided',
      }, 400);
    }

    const sessionId = c.req.header('X-Session-ID') || 'default-session';
    const content = await file.text();

    // Create knowledge entry from file
    const entry: KnowledgeEntry = {
      topic: file.name,
      content: content,
      relations: [],
      observations: [
        {
          category: 'document',
          text: `Uploaded file: ${file.name}`,
        },
      ],
      tags: ['uploaded', 'document'],
      source: 'file-upload',
      metadata: {
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      },
    };

    const result = await captureKnowledge(entry, sessionId);

    return c.json({
      status: result.status,
      filename: file.name,
      entity_path: result.entity_path,
      error: result.error,
    });
  } catch (error) {
    return c.json({
      status: 'error',
      filename: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Mount knowledge routes
app.route('/api/knowledge', knowledge);

// Chat endpoint
app.post('/api/chat', async (c) => {
  try {
    const { message } = await c.req.json();
    const sessionId = c.req.header('X-Session-ID') || 'default-session';

    if (!message) {
      return c.json({
        response: 'Please provide a message',
        sessionId,
      }, 400);
    }

    // Use knowledge query to generate response
    const result = await queryKnowledge({
      question: message,
      session_id: sessionId,
      mode: 'hybrid',
    });

    return c.json({
      response: result.answer,
      sessionId,
    });
  } catch (error) {
    return c.json({
      response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sessionId: c.req.header('X-Session-ID') || 'default-session',
    }, 500);
  }
});

// Tooling endpoints (placeholder for partner's work)
const tooling = new Hono();

tooling.get('/', (c) => {
  return c.json({
    message: 'Tooling endpoints - to be implemented by partner',
  });
});

app.route('/api/tooling', tooling);

// Static file serving (production)
// Serve built frontend from interaction/dist
import { serveStatic } from 'hono/bun';

app.use('/*', serveStatic({ root: './interaction/dist' }));
app.get('/', serveStatic({ path: './interaction/dist/index.html' }));

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
