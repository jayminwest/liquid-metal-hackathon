/**
 * API Tooling Layer
 * Dynamic MCP tool building with agent-driven code generation
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { MCPBuilder } from './builder/mcpBuilder';
import { MCPRunner } from './executor/mcpRunner';
import { parseState, exchangeCode } from './oauth/oauthManager';
import { userContext, successResponse, errorResponse } from '../shared';
import type { AppContext } from '../shared/types/context';

const app = new Hono<AppContext>();

// Global middleware
app.use('/*', cors());

// Service instances
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
 * POST /api/tools/create
 * Create a new MCP tool from natural language request
 */
app.post('/api/tools/create', userContext, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    if (!body.request) {
      return c.json(errorResponse('request field is required'), 400);
    }

    console.log(`[API] Tool creation request from ${user.userId}: ${body.request}`);

    const result = await mcpBuilder.buildTool({
      userId: user.userId,
      userRequest: body.request,
      context: body.context,
    });

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Tool creation failed'), 500);
    }

    return c.json(
      successResponse({
        toolId: result.toolId,
        toolName: result.toolName,
        status: result.status,
        oauthUrl: result.oauthUrl,
        metadata: result.metadata,
      }),
      201
    );
  } catch (error: any) {
    console.error('[API] Tool creation error:', error);
    return c.json(errorResponse(error.message || 'Internal server error'), 500);
  }
});

/**
 * GET /api/tools
 * List all tools for user
 */
app.get('/api/tools', userContext, async (c) => {
  try {
    const user = c.get('user');
    const tools = await mcpRunner.listTools(user.userId);

    return c.json(successResponse({ tools }));
  } catch (error: any) {
    console.error('[API] List tools error:', error);
    return c.json(errorResponse(error.message), 500);
  }
});

/**
 * GET /api/tools/:toolId
 * Get specific tool details
 */
app.get('/api/tools/:toolId', userContext, async (c) => {
  try {
    const user = c.get('user');
    const toolId = c.req.param('toolId');

    const toolDef = await mcpRunner.getToolDefinition(user.userId, toolId);

    if (!toolDef) {
      return c.json(errorResponse(`Tool ${toolId} not found`), 404);
    }

    return c.json(successResponse(toolDef));
  } catch (error: any) {
    console.error('[API] Get tool error:', error);
    return c.json(errorResponse(error.message), 500);
  }
});

/**
 * POST /api/tools/:toolId/execute
 * Execute a tool
 */
app.post('/api/tools/:toolId/execute', userContext, async (c) => {
  try {
    const user = c.get('user');
    const toolId = c.req.param('toolId');
    const body = await c.req.json();

    console.log(`[API] Executing tool ${toolId} for ${user.userId}`);

    const result = await mcpRunner.executeTool(user.userId, {
      toolName: toolId,
      parameters: body.parameters || {},
    });

    if (!result.success) {
      return c.json(errorResponse(result.error || 'Execution failed'), 500);
    }

    return c.json(successResponse(result.data));
  } catch (error: any) {
    console.error('[API] Tool execution error:', error);
    return c.json(errorResponse(error.message), 500);
  }
});

/**
 * DELETE /api/tools/:toolId
 * Delete a tool
 */
app.delete('/api/tools/:toolId', userContext, async (c) => {
  try {
    const user = c.get('user');
    const toolId = c.req.param('toolId');

    // TODO: Implement tool deletion (remove from server, update metadata)
    console.log(`[API] Tool deletion requested: ${toolId} by ${user.userId}`);

    return c.json(successResponse({ deleted: toolId }));
  } catch (error: any) {
    console.error('[API] Tool deletion error:', error);
    return c.json(errorResponse(error.message), 500);
  }
});

/**
 * GET /api/tools/oauth/callback
 * OAuth callback handler
 */
app.get('/api/tools/oauth/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const stateParam = c.req.query('state');
    const error = c.req.query('error');

    // Handle OAuth errors
    if (error) {
      return c.html(`
        <html>
          <body>
            <h1>OAuth Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>Please try again or contact support.</p>
          </body>
        </html>
      `);
    }

    if (!code || !stateParam) {
      return c.html(`
        <html>
          <body>
            <h1>OAuth Error</h1>
            <p>Missing required parameters</p>
          </body>
        </html>
      `);
    }

    // Parse state to get userId and toolId
    const { userId, toolId } = parseState(stateParam);

    console.log(`[API] OAuth callback for user ${userId}, tool ${toolId}`);

    // Exchange code for access token
    // NOTE: We need to know the provider from the tool metadata
    // For hackathon, assume Slack
    const tokens = await exchangeCode('slack', code);

    // Store credentials
    await mcpBuilder.updateToolAfterOAuth(userId, toolId, {
      slackAccessToken: tokens.accessToken,
    });

    // Clear MCP server cache
    mcpRunner.clearCache(userId);

    return c.html(`
      <html>
        <body>
          <h1>OAuth Complete!</h1>
          <p>Your tool is now ready to use.</p>
          <p>Tool ID: ${toolId}</p>
          <p>You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('[API] OAuth callback error:', error);
    return c.html(`
      <html>
        <body>
          <h1>OAuth Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

/**
 * Health check
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'api-tooling', timestamp: new Date().toISOString() });
});

const port = process.env.TOOLING_PORT || 3001;

console.log(`API Tooling Layer running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
