import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppContext } from './types/context';
import { userContext, optionalUserContext } from './middleware/userContext';
import { errorHandler } from './middleware/errorHandler';
import { successResponse, errorResponse } from './utils/response';
import { AnnotationService } from './services/annotation';
import { SmartBucketService } from './services/smartbucket';
import { SmartMemoryService } from './services/smartmemory';
import { MCPStorageService } from './services/mcpStorage';
import { MCPRegistryService } from './services/mcpRegistry';

const app = new Hono<AppContext>();

// Global middleware
app.use('/*', cors());
app.use('/*', errorHandler);

// Service instances (using dummy config for now)
const config = {
  endpoint: process.env.RAINDROP_ENDPOINT || 'http://localhost:3000',
  auth: {
    type: 'bearer' as const,
    token: process.env.RAINDROP_TOKEN || '',
  },
};

const annotationService = new AnnotationService(config);
const smartBucketService = new SmartBucketService(config);
const smartMemoryService = new SmartMemoryService(config);
const mcpStorageService = new MCPStorageService(config);
const mcpRegistryService = new MCPRegistryService(config);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Raindrop CRUD endpoints placeholder
app.get('/raindrop', (c) => {
  return c.json({ message: 'Get all items from Raindrop' });
});

app.get('/raindrop/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ message: `Get item ${id} from Raindrop` });
});

app.post('/raindrop', async (c) => {
  const body = await c.req.json();
  return c.json({ message: 'Create item in Raindrop', data: body }, 201);
});

app.put('/raindrop/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  return c.json({ message: `Update item ${id} in Raindrop`, data: body });
});

app.delete('/raindrop/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ message: `Delete item ${id} from Raindrop` });
});

// User context test endpoint
app.get('/api/user/context', userContext, (c) => {
  const user = c.get('user');
  return c.json(successResponse({
    userId: user.userId,
    message: 'User context extracted successfully',
  }));
});

// MCP Server endpoints
app.get('/api/mcp/server', userContext, async (c) => {
  const user = c.get('user');
  const hasServer = await mcpStorageService.hasServer(user.userId);

  if (!hasServer) {
    return c.json(errorResponse('No MCP server found for user'), 404);
  }

  const [code, metadata] = await Promise.all([
    mcpStorageService.getServerCode(user.userId),
    mcpStorageService.getMetadata(user.userId),
  ]);

  return c.json(successResponse({ code, metadata }));
});

app.post('/api/mcp/server', userContext, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  if (!body.serverCode) {
    return c.json(errorResponse('serverCode is required'), 400);
  }

  await mcpStorageService.storeServerCode(user.userId, body.serverCode);

  if (body.metadata) {
    await mcpStorageService.storeMetadata(user.userId, body.metadata);
  }

  return c.json(successResponse({ message: 'MCP server stored successfully' }), 201);
});

// Tool registry endpoints
app.get('/api/tools', userContext, async (c) => {
  const user = c.get('user');
  const tools = await mcpRegistryService.listTools(user.userId);
  return c.json(successResponse(tools));
});

app.post('/api/tools', userContext, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  if (!body.id || !body.name || !body.template) {
    return c.json(errorResponse('id, name, and template are required'), 400);
  }

  const tool = await mcpRegistryService.registerTool(user.userId, body);
  return c.json(successResponse(tool), 201);
});

app.get('/api/tools/:toolId', userContext, async (c) => {
  const user = c.get('user');
  const toolId = c.req.param('toolId');

  const tool = await mcpRegistryService.getTool(user.userId, toolId);

  if (!tool) {
    return c.json(errorResponse(`Tool ${toolId} not found`), 404);
  }

  return c.json(successResponse(tool));
});

// Knowledge storage endpoints
app.post('/api/knowledge/init', userContext, async (c) => {
  const user = c.get('user');
  const result = await smartBucketService.initializeUserBucket(user.userId);
  return c.json(successResponse(result), 201);
});

app.get('/api/knowledge/search', userContext, async (c) => {
  const user = c.get('user');
  const query = c.req.query('q');

  if (!query) {
    return c.json(errorResponse('Query parameter "q" is required'), 400);
  }

  const results = await smartBucketService.searchKnowledge(user.userId, query);
  return c.json(successResponse(results));
});

// Session memory endpoints
app.post('/api/session/start', userContext, async (c) => {
  const result = await smartMemoryService.startSession();
  return c.json(successResponse(result), 201);
});

app.post('/api/session/:sessionId/memory', userContext, async (c) => {
  const user = c.get('user');
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json();

  if (!body.content) {
    return c.json(errorResponse('content is required'), 400);
  }

  const result = await smartMemoryService.putMemory(
    sessionId,
    user.userId,
    body.content,
    {
      timeline: body.timeline,
      agent: body.agent,
    }
  );

  return c.json(successResponse(result), 201);
});

app.get('/api/session/:sessionId/memory', userContext, async (c) => {
  const user = c.get('user');
  const sessionId = c.req.param('sessionId');

  const result = await smartMemoryService.getMemory(sessionId, user.userId);
  return c.json(successResponse(result));
});

const port = process.env.PORT || 3000;

console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
