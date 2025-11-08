/**
 * Main API Server
 * Uses Hono for lightweight, fast HTTP routing with Bun
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { stream } from 'hono/streaming';
import { captureKnowledge, updateKnowledge, syncRecentChanges } from '@knowledge/sync';
import { queryKnowledge, findRelatedEntities, getRecentKnowledge } from '@knowledge/retrieval';
import { generateKnowledgeGraph, suggestConnections } from '@knowledge/graph';
import type { KnowledgeEntry, QueryRequest } from '@shared/types';
import { chat as aiChat, chatStream } from '@shared/ai';
import {
  createConversation,
  listConversations,
  getConversation,
  addMessage,
  deleteConversation,
} from '@shared/conversations';
import { getBasicMemoryClient } from '@shared/basicMemory';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const app = new Hono();

// Middleware
app.use('*', async (c, next) => {
  console.log(`[APP] Incoming request: ${c.req.method} ${c.req.url}`);
  await next();
});
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
console.log('[SERVER STARTUP] Creating knowledge router...');
const knowledge = new Hono();

console.log('[SERVER STARTUP] Adding knowledge middleware...');
// Middleware to log all knowledge requests
knowledge.use('*', async (c, next) => {
  console.log(`[knowledge middleware] ${c.req.method} ${c.req.url}`);
  await next();
  console.log(`[knowledge middleware] Response sent`);
});

console.log('[SERVER STARTUP] Adding capture endpoint...');
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

// Health check
knowledge.get('/health', async (c) => {
  console.log('[health] Health check requested');
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Browse data directory
knowledge.get('/browse', async (c) => {
  console.log('[browse] ===== REQUEST RECEIVED =====');
  try {
    const path = c.req.query('path') || '';
    console.log('[browse] Path parameter:', path);
    console.log('[browse] Getting basicMemory client...');
    const basicMemory = await getBasicMemoryClient();
    console.log('[browse] Client obtained, calling listDirectory...');
    const result = await basicMemory.listDirectory({ path });
    console.log('[browse] listDirectory returned, files:', result.files.length);
    console.log('[browse] Sending JSON response...');
    return c.json(result);
  } catch (error) {
    console.error('[browse] ERROR CAUGHT:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Read markdown file
knowledge.get('/file', async (c) => {
  try {
    const path = c.req.query('path');
    if (!path) {
      return c.json({ error: 'Path is required' }, 400);
    }
    const basicMemory = await getBasicMemoryClient();
    const result = await basicMemory.readNote({ path });
    return c.json({ content: result.content, path });
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
console.log('[SERVER STARTUP] Mounting knowledge routes at /api/knowledge...');
app.route('/api/knowledge', knowledge);
console.log('[SERVER STARTUP] Knowledge routes mounted successfully');

// Conversation endpoints
const conversations = new Hono();

// List all conversations
conversations.get('/', async (c) => {
  try {
    const convos = await listConversations();
    return c.json({ conversations: convos });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Get specific conversation
conversations.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const conversation = await getConversation(id);

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({ conversation });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Delete conversation
conversations.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await deleteConversation(id);
    return c.json({ status: 'deleted', id });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Send message in conversation
conversations.post('/:id/messages', async (c) => {
  try {
    const conversationId = c.req.param('id');
    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // Get existing conversation
    let conversation = await getConversation(conversationId);

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // Add user message
    conversation = await addMessage(conversationId, 'user', message);

    // Build message history for AI
    const messages: ChatCompletionMessageParam[] = conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get AI response
    const aiResponse = await aiChat(messages, conversation.sessionId);

    // Add assistant message
    conversation = await addMessage(conversationId, 'assistant', aiResponse);

    return c.json({ conversation });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

app.route('/api/conversations', conversations);

// Test endpoint
app.get('/api/test', (c) => {
  console.log('[TEST] Test endpoint hit!');
  return c.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

// Test streaming endpoint
app.post('/api/test/stream', async (c) => {
  console.log('[TEST STREAM] Request received');

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return stream(c, async (stream) => {
    console.log('[TEST STREAM] Starting stream');

    await stream.write(`data: ${JSON.stringify({type: 'status', message: 'Step 1'})}\n\n`);
    console.log('[TEST STREAM] Sent step 1');

    await new Promise(resolve => setTimeout(resolve, 500));

    await stream.write(`data: ${JSON.stringify({type: 'status', message: 'Step 2'})}\n\n`);
    console.log('[TEST STREAM] Sent step 2');

    await new Promise(resolve => setTimeout(resolve, 500));

    await stream.write(`data: ${JSON.stringify({type: 'response', message: 'Test response!'})}\n\n`);
    console.log('[TEST STREAM] Sent response');

    await stream.write(`data: ${JSON.stringify({type: 'done', message: ''})}\n\n`);
    console.log('[TEST STREAM] Stream complete');
  });
});

// Streaming chat endpoint (Server-Sent Events)
app.post('/api/chat/stream', async (c) => {
  console.log('[/api/chat/stream] ===== REQUEST RECEIVED =====');
  try {
    const { message, conversationId } = await c.req.json();
    console.log('[/api/chat/stream] Message:', message?.substring(0, 50), 'ConvID:', conversationId);

    if (!message) {
      return c.json({
        error: 'Message is required',
      }, 400);
    }

    let conversation;

    if (conversationId) {
      // Continue existing conversation
      console.log('[/api/chat/stream] Getting existing conversation:', conversationId);
      conversation = await getConversation(conversationId);

      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404);
      }

      conversation = await addMessage(conversationId, 'user', message);
    } else {
      // Create new conversation
      console.log('[/api/chat/stream] Creating new conversation');
      conversation = await createConversation(message);
      console.log('[/api/chat/stream] New conversation ID:', conversation.id);
    }

    // Build message history for AI
    const messages: ChatCompletionMessageParam[] = conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    console.log('[/api/chat/stream] Message history length:', messages.length);

    // Set headers for SSE before streaming
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    let responseContent = '';

    console.log('[/api/chat/stream] Starting stream...');
    // Use streaming helper
    return stream(c, async (stream) => {
      console.log('[/api/chat/stream] Inside stream callback');
      try {
        // Stream status updates
        console.log('[/api/chat/stream] Starting chatStream iteration');
        for await (const update of chatStream(messages, conversation.sessionId)) {
          console.log('[SSE] Sending update:', update.type, update.message.substring(0, 50));
          await stream.write(`data: ${JSON.stringify(update)}\n\n`);

          if (update.type === 'response') {
            responseContent = update.message;
          }
        }

        // Add assistant message to conversation
        if (responseContent) {
          await addMessage(conversation.id, 'assistant', responseContent);
        }

        // Send conversation ID at the end
        await stream.write(`data: ${JSON.stringify({
          type: 'metadata',
          conversationId: conversation.id
        })}\n\n`);
      } catch (error) {
        console.error('Streaming error:', error);
        await stream.write(`data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`);
      }
    });
  } catch (error) {
    console.error('Chat stream error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Chat endpoint (creates new conversation or continues existing)
app.post('/api/chat', async (c) => {
  try {
    const { message, conversationId } = await c.req.json();

    if (!message) {
      return c.json({
        error: 'Message is required',
      }, 400);
    }

    let conversation;

    if (conversationId) {
      // Continue existing conversation
      conversation = await getConversation(conversationId);

      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404);
      }

      conversation = await addMessage(conversationId, 'user', message);
    } else {
      // Create new conversation
      conversation = await createConversation(message);
    }

    // Build message history for AI
    const messages: ChatCompletionMessageParam[] = conversation.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get AI response
    const aiResponse = await aiChat(messages, conversation.sessionId);

    // Add assistant message
    conversation = await addMessage(conversation.id, 'assistant', aiResponse);

    return c.json({
      response: aiResponse,
      conversationId: conversation.id,
      conversation,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
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
