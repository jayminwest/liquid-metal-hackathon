# api/tooling/ Directory Structure

**Version:** 1.0
**Date:** November 8, 2025
**Based on:** SHARED_API_PLAN.md, api.md, PRD.md, ARCHITECTURE.md

---

## Executive Summary

The `api/tooling/` directory implements **dynamic MCP tool generation** using Claude Code SDK agents with Raindrop orchestration. Instead of static templates, AI agents autonomously build user-specific MCP tools based on natural language requests.

**Key Architecture Points:**
- **Agent-Driven**: Claude Code SDK agents generate tools dynamically
- **Raindrop Orchestration**: Uses Raindrop MCP server for workflow management
- **Per-User MCP Servers**: Each user has ONE MCP server containing all their tools
- **OAuth Management**: Automated OAuth flow setup and credential storage
- **Template References**: Templates guide agents but aren't used directly

---

## Directory Structure

```
api/tooling/
├── index.ts                          # Main Hono router - API endpoints
│
├── agent/                            # Claude Code SDK agent components
│   ├── toolBuilderAgent.ts          # Core agent that builds MCP tools
│   ├── orchestrationClient.ts       # Client wrapper for Raindrop orchestration
│   └── agentPrompts.ts               # System prompts and guidelines for agent
│
├── templates/                        # Reference templates for agent guidance
│   ├── base.template.ts              # Base MCP server structure
│   ├── slack.template.ts             # Slack integration reference
│   ├── github.template.ts            # GitHub integration reference
│   ├── email.template.ts             # Email integration reference
│   └── notion.template.ts            # Notion integration reference (nice-to-have)
│
├── builder/                          # Tool building coordination
│   ├── mcpBuilder.ts                 # Coordinates agent-based tool building
│   ├── templateEngine.ts             # Injects user data into templates (fallback)
│   └── toolMerger.ts                 # Merges new tools into existing MCP server
│
├── oauth/                            # OAuth flow handlers
│   ├── oauthManager.ts               # Generic OAuth management
│   ├── slackOAuth.ts                 # Slack-specific OAuth flow
│   ├── githubOAuth.ts                # GitHub-specific OAuth flow
│   └── providers.ts                  # OAuth provider configurations
│
└── executor/                         # Tool execution
    ├── mcpRunner.ts                  # Loads and executes user MCP servers
    └── sandboxRunner.ts              # (Optional) Sandboxed execution environment
```

---

## File-by-File Breakdown

### index.ts - Main API Router

**Purpose:** Expose HTTP endpoints for tool creation, execution, and management

**Endpoints:**
```typescript
POST   /api/tools/create           // Request new tool creation (agent-based)
GET    /api/tools                  // List user's tools
GET    /api/tools/:id              // Get specific tool details
POST   /api/tools/:id/execute      // Execute a tool
DELETE /api/tools/:id              // Remove a tool
GET    /api/tools/oauth/callback   // OAuth callback handler
POST   /api/tools/:id/refresh      // Refresh tool (update/rebuild)
```

**Key Responsibilities:**
- Route requests to appropriate handlers
- Extract userId from context (via middleware)
- Coordinate between agent, OAuth, and execution layers
- Return standardized API responses

**Example Implementation:**
```typescript
import { Hono } from 'hono';
import { AppContext } from '../shared/types/context';
import { userContextMiddleware } from '../shared/middleware/userContext';
import { MCPBuilder } from './builder/mcpBuilder';
import { MCPRunner } from './executor/mcpRunner';
import { MCPRegistry } from '../shared/services/mcpRegistry';
import { OAuthManager } from './oauth/oauthManager';

const tooling = new Hono<AppContext>();

// Apply user context middleware
tooling.use('*', userContextMiddleware);

// Create new tool (agent-based)
tooling.post('/create', async (c) => {
  const userId = c.get('userId');
  const { request, context, capabilities } = await c.req.json();

  const builder = new MCPBuilder();
  const result = await builder.createTool(userId, {
    request,
    context,
    capabilities
  });

  return c.json(result);
});

// List user's tools
tooling.get('/', async (c) => {
  const userId = c.get('userId');
  const registry = new MCPRegistry();
  const tools = await registry.getUserTools(userId);

  return c.json({ success: true, data: tools });
});

// Execute tool
tooling.post('/:id/execute', async (c) => {
  const userId = c.get('userId');
  const toolId = c.req.param('id');
  const { action, params } = await c.req.json();

  const runner = new MCPRunner();
  const result = await runner.execute(userId, toolId, action, params);

  return c.json(result);
});

// OAuth callback
tooling.get('/oauth/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  const oauthManager = new OAuthManager();
  const result = await oauthManager.handleCallback(code, state);

  return c.html(result.html);
});

export default tooling;
```

---

### agent/toolBuilderAgent.ts - Core Tool Building Agent

**Purpose:** Claude Code SDK agent that autonomously generates MCP tool code

**Key Functions:**
```typescript
export class ToolBuilderAgent {
  /**
   * Spawn agent to build a tool based on user request
   */
  async buildTool(request: ToolBuildRequest): Promise<ToolBuildResult>

  /**
   * Analyze user's natural language request
   */
  private async analyzeRequest(request: string): Promise<ToolAnalysis>

  /**
   * Generate MCP tool code using orchestration workflow
   */
  private async generateToolCode(analysis: ToolAnalysis): Promise<string>

  /**
   * Set up OAuth configuration
   */
  private async setupOAuth(toolType: string): Promise<OAuthConfig>

  /**
   * Validate generated code
   */
  private async validateCode(code: string): Promise<ValidationResult>

  /**
   * Store tool in Raindrop
   */
  private async storeTool(userId: string, toolId: string, code: string): Promise<void>
}

interface ToolBuildRequest {
  userId: string;
  request: string;              // "I want to read my Slack channels"
  context?: string;             // "monitoring team discussions"
  existingServer?: string;      // Existing MCP server code
  capabilities?: string[];      // Optional: specific capabilities requested
}

interface ToolBuildResult {
  toolId: string;
  toolCode: string;
  oauthRequired: boolean;
  oauthUrl?: string;
  metadata: ToolMetadata;
  artifacts: Record<string, any>;
}

interface ToolAnalysis {
  toolType: string;             // 'slack', 'github', 'email', etc.
  capabilities: string[];       // ['readChannels', 'searchMessages']
  requiredAuth: 'oauth' | 'apikey' | 'none';
  apiEndpoints: string[];       // External APIs needed
  complexity: 'simple' | 'medium' | 'complex';
}
```

**Agent Workflow:**
```typescript
async buildTool(request: ToolBuildRequest): Promise<ToolBuildResult> {
  // 1. Start orchestration session
  const session = await this.orchestrationClient.startSession(request.userId);

  // 2. Get initial workflow prompt
  const { prompt } = await this.orchestrationClient.getPrompt(session.sessionId);

  // 3. Analyze user request
  const analysis = await this.analyzeRequest(request.request);

  // 4. Generate tool code using agent
  const toolCode = await this.generateToolCode(analysis);

  // 5. Set up OAuth if needed
  let oauthConfig = null;
  if (analysis.requiredAuth === 'oauth') {
    oauthConfig = await this.setupOAuth(analysis.toolType);
  }

  // 6. Validate generated code
  const validation = await this.validateCode(toolCode);
  if (!validation.valid) {
    throw new Error(`Code validation failed: ${validation.errors}`);
  }

  // 7. Store in Raindrop
  const toolId = this.generateToolId(analysis.toolType);
  await this.storeTool(request.userId, toolId, toolCode);

  // 8. Update orchestration state
  await this.orchestrationClient.updateState(session.sessionId, {
    toolId,
    toolCode,
    oauthConfig,
    analysis
  }, 'complete');

  // 9. Return results
  return {
    toolId,
    toolCode,
    oauthRequired: !!oauthConfig,
    oauthUrl: oauthConfig?.authUrl,
    metadata: this.buildMetadata(toolId, analysis),
    artifacts: { analysis, oauthConfig }
  };
}
```

---

### agent/orchestrationClient.ts - Raindrop Orchestration Wrapper

**Purpose:** Clean interface for agent to interact with Raindrop orchestration

**Key Functions:**
```typescript
export class OrchestrationClient {
  /**
   * Start new tool building workflow
   */
  async startSession(userId: string): Promise<{ sessionId: string, timelineId: string }>

  /**
   * Get workflow prompt/instructions
   */
  async getPrompt(sessionId: string): Promise<{ prompt: string, state: string, timeline_id: string }>

  /**
   * Update workflow state with artifacts
   */
  async updateState(
    sessionId: string,
    artifacts: Record<string, any>,
    status: 'complete' | 'failed' | 'blocked'
  ): Promise<void>

  /**
   * Store artifact in working memory
   */
  async storeArtifact(sessionId: string, key: string, value: any): Promise<void>

  /**
   * Retrieve artifact
   */
  async getArtifact(sessionId: string, key: string): Promise<any>

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void>
}
```

**Integration with Raindrop MCP:**
```typescript
class OrchestrationClient {
  private raindrop: RaindropService;

  async startSession(userId: string) {
    // Use Raindrop orchestration MCP tools
    const result = await mcp__raindrop_mcp__start_session();
    return {
      sessionId: result.session_id,
      timelineId: result.timeline_id
    };
  }

  async getPrompt(sessionId: string) {
    const result = await mcp__raindrop_mcp__get_prompt({ session_id: sessionId });
    return {
      prompt: result.prompt,
      state: result.state,
      timeline_id: result.timeline_id
    };
  }

  async updateState(sessionId: string, artifacts: any, status: string) {
    await mcp__raindrop_mcp__update_state({
      session_id: sessionId,
      timeline_id: this.currentTimelineId,
      artifacts,
      status
    });
  }
}
```

---

### agent/agentPrompts.ts - System Prompts for Agent

**Purpose:** Provide guidelines, examples, and instructions for the tool builder agent

**Key Exports:**
```typescript
export const TOOL_BUILDER_SYSTEM_PROMPT = `
You are a tool builder agent specialized in creating MCP server tools.

Your job is to:
1. Analyze user requests for custom tools
2. Generate MCP-compliant tool code
3. Set up authentication flows (OAuth, API keys)
4. Ensure tools are secure and well-documented

You have access to:
- Raindrop orchestration workflow tools
- Raindrop storage (buckets, annotations)
- Reference templates for common integrations
- MCP specification documentation

Follow these guidelines:
- Always validate user input
- Use proper error handling
- Follow MCP best practices
- Document all tool functions
- Set up OAuth securely
- Test generated code before returning
`;

export const OAUTH_SETUP_PROMPT = `
When setting up OAuth for a tool:
1. Identify the OAuth provider (Slack, GitHub, etc.)
2. Determine required scopes based on capabilities
3. Generate OAuth configuration with redirect URLs
4. Store credentials securely
5. Provide clear instructions to user
`;

export const TOOL_EXAMPLES = {
  slack: `
// Example Slack MCP tool
export const slackTool = {
  name: 'slack-reader',
  description: 'Read Slack channels and search messages',
  async readChannel(channelId: string, credentials: any) {
    const response = await fetch(\`https://slack.com/api/conversations.history?channel=\${channelId}\`, {
      headers: { 'Authorization': \`Bearer \${credentials.accessToken}\` }
    });
    return response.json();
  }
};
`,
  github: `
// Example GitHub MCP tool
export const githubTool = {
  name: 'github-issues',
  description: 'Manage GitHub issues',
  async listIssues(repo: string, credentials: any) {
    const response = await fetch(\`https://api.github.com/repos/\${repo}/issues\`, {
      headers: { 'Authorization': \`token \${credentials.accessToken}\` }
    });
    return response.json();
  }
};
`
};
```

---

### templates/base.template.ts - Base MCP Server Structure

**Purpose:** Reference template for base MCP server structure

**Content:**
```typescript
export const baseMCPServerTemplate = `
import { MCPServer, Tool } from '@modelcontextprotocol/sdk';

export class UserMCPServer {
  private tools: Map<string, Tool> = new Map();
  private credentials: any = {};

  constructor(credentials?: any) {
    this.credentials = credentials || {};
  }

  registerTool(toolId: string, tool: Tool) {
    this.tools.set(toolId, tool);
  }

  async executeTool(toolId: string, action: string, params: any) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(\`Tool not found: \${toolId}\`);
    }

    const credentials = this.credentials[toolId];
    if (!credentials && tool.requiresAuth) {
      throw new Error(\`Tool requires authentication: \${toolId}\`);
    }

    return tool[action](params, credentials);
  }

  listTools() {
    return Array.from(this.tools.keys());
  }

  getToolInfo(toolId: string) {
    const tool = this.tools.get(toolId);
    return tool ? {
      id: toolId,
      name: tool.name,
      description: tool.description,
      actions: Object.keys(tool).filter(k => typeof tool[k] === 'function')
    } : null;
  }
}
`;

export interface MCPServerTemplate {
  templateId: string;
  name: string;
  description: string;
  baseCode: string;
}

export const baseTemplate: MCPServerTemplate = {
  templateId: 'base',
  name: 'Base MCP Server',
  description: 'Foundation for all user MCP servers',
  baseCode: baseMCPServerTemplate
};
```

---

### templates/slack.template.ts - Slack Integration Reference

**Purpose:** Guide agent in building Slack tools

**Content:**
```typescript
export const slackToolTemplate = {
  templateId: 'slack',
  name: 'Slack Integration',
  description: 'Read channels, send messages, search Slack',

  requiredScopes: [
    'channels:read',
    'channels:history',
    'chat:write',
    'search:read'
  ],

  oauthConfig: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    requiredParams: ['client_id', 'client_secret', 'redirect_uri', 'scope']
  },

  exampleTool: `
export const slackTool = {
  name: 'slack-reader',
  description: 'Read Slack channels and messages',
  requiresAuth: true,

  async readChannel(params: { channel: string }, credentials: any) {
    const response = await fetch(
      \`https://slack.com/api/conversations.history?channel=\${params.channel}\`,
      {
        headers: {
          'Authorization': \`Bearer \${credentials.accessToken}\`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(\`Slack API error: \${response.statusText}\`);
    }

    const data = await response.json();
    return data.messages;
  },

  async sendMessage(params: { channel: string, text: string }, credentials: any) {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${credentials.accessToken}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: params.channel,
        text: params.text
      })
    });

    return response.json();
  },

  async searchMessages(params: { query: string }, credentials: any) {
    const response = await fetch(
      \`https://slack.com/api/search.messages?query=\${encodeURIComponent(params.query)}\`,
      {
        headers: {
          'Authorization': \`Bearer \${credentials.accessToken}\`
        }
      }
    );

    const data = await response.json();
    return data.messages.matches;
  }
};
`
};

export default slackToolTemplate;
```

---

### builder/mcpBuilder.ts - Coordinates Agent Execution

**Purpose:** Main orchestrator for tool building process

**Key Functions:**
```typescript
export class MCPBuilder {
  private agent: ToolBuilderAgent;
  private registry: MCPRegistry;
  private storage: MCPStorage;
  private merger: ToolMerger;

  constructor() {
    this.agent = new ToolBuilderAgent();
    this.registry = new MCPRegistry();
    this.storage = new MCPStorage();
    this.merger = new ToolMerger();
  }

  /**
   * Create new tool using agent
   */
  async createTool(userId: string, request: ToolCreationRequest): Promise<ToolCreationResult> {
    // 1. Check if user has existing MCP server
    const existingServer = await this.storage.loadMCPServer(userId);

    // 2. Spawn agent to build tool
    const agentResult = await this.agent.buildTool({
      userId,
      request: request.request,
      context: request.context,
      existingServer: existingServer?.code,
      capabilities: request.capabilities
    });

    // 3. Merge tool into existing server or create new server
    let serverCode;
    if (existingServer) {
      serverCode = await this.merger.mergeTool(
        existingServer.code,
        agentResult.toolCode,
        agentResult.toolId
      );
    } else {
      serverCode = await this.merger.createServerWithTool(
        agentResult.toolCode,
        agentResult.toolId
      );
    }

    // 4. Save updated server
    await this.storage.saveMCPServer(userId, serverCode, {
      toolCount: (existingServer?.metadata.toolCount || 0) + 1,
      lastUpdated: new Date().toISOString()
    });

    // 5. Register tool metadata
    await this.storage.registerTool(userId, agentResult.toolId, agentResult.metadata);

    // 6. Return result with OAuth URL if needed
    return {
      success: true,
      toolId: agentResult.toolId,
      status: agentResult.oauthRequired ? 'pending_oauth' : 'active',
      oauthUrl: agentResult.oauthUrl,
      agentGenerated: true,
      metadata: agentResult.metadata
    };
  }

  /**
   * Update existing tool
   */
  async updateTool(userId: string, toolId: string, updates: ToolUpdates): Promise<void>

  /**
   * Delete tool from server
   */
  async deleteTool(userId: string, toolId: string): Promise<void>
}

interface ToolCreationRequest {
  request: string;              // Natural language request
  context?: string;             // Additional context
  capabilities?: string[];      // Specific capabilities
}

interface ToolCreationResult {
  success: boolean;
  toolId: string;
  status: 'pending_oauth' | 'active' | 'error';
  oauthUrl?: string;
  agentGenerated: boolean;
  metadata: ToolMetadata;
}
```

---

### builder/toolMerger.ts - Merge Tools into MCP Server

**Purpose:** Combine new tools with existing MCP server code

**Key Functions:**
```typescript
export class ToolMerger {
  /**
   * Merge new tool into existing MCP server
   */
  async mergeTool(
    existingServerCode: string,
    newToolCode: string,
    toolId: string
  ): Promise<string> {
    // Parse existing server
    const server = this.parseServer(existingServerCode);

    // Parse new tool
    const tool = this.parseTool(newToolCode);

    // Merge tool into server
    server.tools.set(toolId, tool);

    // Generate updated server code
    return this.generateServerCode(server);
  }

  /**
   * Create new MCP server with single tool
   */
  async createServerWithTool(toolCode: string, toolId: string): Promise<string> {
    const baseServer = this.loadBaseTemplate();
    return this.mergeTool(baseServer, toolCode, toolId);
  }

  /**
   * Remove tool from server
   */
  async removeTool(serverCode: string, toolId: string): Promise<string>

  /**
   * Parse server code into structured format
   */
  private parseServer(code: string): ParsedServer

  /**
   * Parse tool code
   */
  private parseTool(code: string): ParsedTool

  /**
   * Generate server code from structure
   */
  private generateServerCode(server: ParsedServer): string
}

interface ParsedServer {
  tools: Map<string, ParsedTool>;
  credentials: any;
  metadata: any;
}

interface ParsedTool {
  id: string;
  name: string;
  description: string;
  actions: Map<string, Function>;
  requiresAuth: boolean;
}
```

---

### oauth/oauthManager.ts - Generic OAuth Management

**Purpose:** Handle OAuth flows for all providers

**Key Functions:**
```typescript
export class OAuthManager {
  private providers: Map<string, OAuthProvider>;
  private storage: MCPStorage;

  constructor() {
    this.providers = new Map([
      ['slack', new SlackOAuthProvider()],
      ['github', new GitHubOAuthProvider()]
    ]);
    this.storage = new MCPStorage();
  }

  /**
   * Generate OAuth URL for provider
   */
  async generateAuthUrl(
    provider: string,
    userId: string,
    toolId: string,
    scopes: string[]
  ): Promise<string> {
    const oauthProvider = this.providers.get(provider);
    if (!oauthProvider) {
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    const state = this.encodeState(userId, toolId);
    return oauthProvider.getAuthUrl(scopes, state);
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string): Promise<OAuthCallbackResult> {
    const { userId, toolId } = this.decodeState(state);

    // Get tool metadata to determine provider
    const registry = new MCPRegistry();
    const toolMeta = await registry.getToolMetadata(userId, toolId);

    const provider = this.providers.get(toolMeta.template);
    if (!provider) {
      throw new Error(`Provider not found: ${toolMeta.template}`);
    }

    // Exchange code for tokens
    const tokens = await provider.exchangeCodeForTokens(code);

    // Load existing credentials
    const existingCreds = await this.storage.loadMCPServer(userId);
    const credentials = existingCreds?.credentials || {};

    // Add new tool credentials
    credentials[toolId] = tokens;

    // Save updated credentials
    await this.storage.saveCredentials(userId, credentials);

    // Update tool metadata
    await this.storage.registerTool(userId, toolId, {
      ...toolMeta,
      status: 'active',
      oauthComplete: true
    });

    return {
      success: true,
      html: this.successPage(toolId)
    };
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(userId: string, toolId: string): Promise<void>

  private encodeState(userId: string, toolId: string): string {
    return Buffer.from(JSON.stringify({ userId, toolId })).toString('base64');
  }

  private decodeState(state: string): { userId: string, toolId: string } {
    return JSON.parse(Buffer.from(state, 'base64').toString());
  }

  private successPage(toolId: string): string {
    return `<html><body><h1>OAuth Complete!</h1><p>Your tool "${toolId}" is ready to use.</p></body></html>`;
  }
}

interface OAuthProvider {
  getAuthUrl(scopes: string[], state: string): string;
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;
}

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  teamId?: string;
  [key: string]: any;
}

interface OAuthCallbackResult {
  success: boolean;
  html: string;
}
```

---

### oauth/slackOAuth.ts - Slack OAuth Provider

**Purpose:** Slack-specific OAuth implementation

**Content:**
```typescript
import { OAuthProvider, OAuthTokens } from './oauthManager';

export class SlackOAuthProvider implements OAuthProvider {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    // Load from environment
    this.clientId = process.env.SLACK_CLIENT_ID!;
    this.clientSecret = process.env.SLACK_CLIENT_SECRET!;
    this.redirectUri = `${process.env.OAUTH_REDIRECT_BASE}/api/tools/oauth/callback`;
  }

  getAuthUrl(scopes: string[], state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: scopes.join(','),
      redirect_uri: this.redirectUri,
      state
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    return {
      accessToken: data.access_token,
      teamId: data.team.id,
      teamName: data.team.name,
      authedUser: data.authed_user
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    // Slack doesn't use refresh tokens by default
    throw new Error('Slack tokens do not expire');
  }
}
```

---

### executor/mcpRunner.ts - Execute User Tools

**Purpose:** Load user's MCP server and execute tools

**Key Functions:**
```typescript
export class MCPRunner {
  private storage: MCPStorage;
  private serverCache: Map<string, any> = new Map();

  constructor() {
    this.storage = new MCPStorage();
  }

  /**
   * Execute a tool action
   */
  async execute(
    userId: string,
    toolId: string,
    action: string,
    params: any
  ): Promise<ToolExecutionResult> {
    // 1. Load user's MCP server (with caching)
    const server = await this.loadServer(userId);

    // 2. Verify tool exists
    if (!server.listTools().includes(toolId)) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // 3. Execute tool action
    try {
      const result = await server.executeTool(toolId, action, params);

      // 4. Update tool usage metadata
      await this.updateLastUsed(userId, toolId);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Load server from storage or cache
   */
  private async loadServer(userId: string): Promise<any> {
    // Check cache
    if (this.serverCache.has(userId)) {
      return this.serverCache.get(userId);
    }

    // Load from storage
    const { code, credentials } = await this.storage.loadMCPServer(userId);

    // Dynamic import (use Bun's capabilities)
    const serverModule = await this.importServerCode(code, credentials);

    // Cache server instance
    this.serverCache.set(userId, serverModule.default);

    return serverModule.default;
  }

  /**
   * Dynamically import server code
   */
  private async importServerCode(code: string, credentials: any): Promise<any> {
    // Option 1: Use data URL import (Bun supports this)
    const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
    const module = await import(dataUrl);

    // Initialize with credentials
    return new module.UserMCPServer(credentials);
  }

  /**
   * Update tool last used timestamp
   */
  private async updateLastUsed(userId: string, toolId: string): Promise<void> {
    const registry = new MCPRegistry();
    const metadata = await registry.getToolMetadata(userId, toolId);

    await this.storage.registerTool(userId, toolId, {
      ...metadata,
      lastUsed: new Date().toISOString()
    });
  }

  /**
   * Clear cache for user (e.g., after tool update)
   */
  clearCache(userId: string): void {
    this.serverCache.delete(userId);
  }
}

interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}
```

---

## Key Workflows

### 1. Tool Creation Flow (Agent-Based)

```
User Request: "I want to read my Slack channels"
  ↓
POST /api/tools/create
  {
    userId: 'user123',
    request: 'I want to read my Slack channels and search messages',
    context: 'monitoring team discussions'
  }
  ↓
mcpBuilder.createTool()
  ↓
  1. Load existing MCP server (if any)
  2. Spawn ToolBuilderAgent
  ↓
ToolBuilderAgent.buildTool()
  ↓
  1. Start orchestration session
  2. Analyze request → determines: Slack integration
  3. Generate MCP tool code (using agent AI)
  4. Set up OAuth configuration
  5. Validate generated code
  6. Store tool code in Raindrop
  7. Update orchestration state
  ↓
toolMerger.mergeTool()
  ↓
  1. Parse existing server
  2. Add new Slack tool
  3. Generate updated server code
  ↓
storage.saveMCPServer()
storage.registerTool()
  ↓
Response:
  {
    success: true,
    toolId: 'slack-reader',
    status: 'pending_oauth',
    oauthUrl: 'https://slack.com/oauth/v2/authorize?...',
    agentGenerated: true
  }
  ↓
User clicks OAuth URL → completes authorization
  ↓
GET /api/tools/oauth/callback?code=xxx&state=user123:slack-reader
  ↓
oauthManager.handleCallback()
  ↓
  1. Decode state → get userId, toolId
  2. Exchange code for tokens
  3. Store credentials in Raindrop
  4. Update tool status: 'active'
  ↓
Response: "OAuth complete! Tool is ready."
```

---

### 2. Tool Execution Flow

```
User: "Show me messages from #general"
  ↓
POST /api/tools/slack-reader/execute
  {
    userId: 'user123',
    action: 'readChannel',
    params: { channel: '#general' }
  }
  ↓
mcpRunner.execute()
  ↓
  1. Load user's MCP server from cache/storage
  2. Verify 'slack-reader' tool exists
  3. Execute: server.executeTool('slack-reader', 'readChannel', params)
     ↓
     Tool code runs:
     - Fetches credentials for slack-reader
     - Calls Slack API with accessToken
     - Returns channel messages
  4. Update lastUsed timestamp
  ↓
Response:
  {
    success: true,
    data: [
      { user: 'alice', message: 'Hello!', timestamp: '...' },
      { user: 'bob', message: 'Meeting at 3pm', timestamp: '...' }
    ]
  }
```

---

## Integration with api/shared/

### Dependencies on shared services:

```typescript
// From api/shared/services/
import { MCPRegistry } from '../shared/services/mcpRegistry';
import { MCPStorage } from '../shared/services/mcpStorage';
import { AgentOrchestrationService } from '../shared/services/agentOrchestration';
import { RaindropService } from '../shared/services/raindrop';

// From api/shared/utils/
import { getUserKey, getMCPServerPath } from '../shared/utils/userScoping';
import { validateToolId } from '../shared/utils/validation';
import { successResponse, errorResponse } from '../shared/utils/response';

// From api/shared/types/
import { AppContext } from '../shared/types/context';
import { MCPServerMetadata, ToolMetadata } from '../shared/types/mcp';
import { Env } from '../shared/types/env';

// From api/shared/middleware/
import { userContextMiddleware } from '../shared/middleware/userContext';
```

---

## Environment Requirements

### OAuth Credentials (from Env):
```typescript
SLACK_CLIENT_ID: string
SLACK_CLIENT_SECRET: string
GITHUB_CLIENT_ID: string
GITHUB_CLIENT_SECRET: string
OAUTH_REDIRECT_BASE: string  // e.g., http://localhost:3000
```

### Raindrop Resources:
```typescript
USER_MCP_SERVERS: Bucket           // Store MCP server code
TOOL_TEMPLATES: Bucket             // Reference templates
annotation: Annotation             // Tool metadata
```

---

## Implementation Priority

### Phase 1: Foundation (4-6 hours)
1. **index.ts** - API routes skeleton
2. **templates/base.template.ts** - Base MCP server structure
3. **builder/toolMerger.ts** - Basic merge logic
4. **executor/mcpRunner.ts** - Tool execution engine

### Phase 2: Agent Infrastructure (6-8 hours)
5. **agent/agentPrompts.ts** - System prompts
6. **agent/orchestrationClient.ts** - Raindrop orchestration wrapper
7. **agent/toolBuilderAgent.ts** - Core agent implementation
8. **builder/mcpBuilder.ts** - Orchestrate agent execution

### Phase 3: OAuth & Templates (3-4 hours)
9. **oauth/oauthManager.ts** - Generic OAuth handling
10. **oauth/slackOAuth.ts** - Slack OAuth implementation
11. **templates/slack.template.ts** - Slack reference
12. **oauth/githubOAuth.ts** - GitHub OAuth (nice-to-have)

### Phase 4: Testing & Polish (2-3 hours)
13. End-to-end testing
14. Error handling improvements
15. Documentation

**Total Estimated Time:** 15-21 hours (Day 2 focus)

---

## Testing Strategy

### Manual Tests:

```bash
# 1. Create Slack tool
curl -X POST http://localhost:3000/api/tools/create \
  -H "X-User-ID: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "request": "I want to read my Slack channels",
    "context": "team monitoring"
  }'

# Expected: { toolId, oauthUrl, status: 'pending_oauth' }

# 2. List tools
curl http://localhost:3000/api/tools \
  -H "X-User-ID: user123"

# Expected: [{ toolId: 'slack-reader', status: 'pending_oauth', ... }]

# 3. Complete OAuth (manual browser step)
# Click oauthUrl, authorize, redirected back

# 4. Verify tool is active
curl http://localhost:3000/api/tools/slack-reader \
  -H "X-User-ID: user123"

# Expected: { status: 'active', oauthComplete: true }

# 5. Execute tool
curl -X POST http://localhost:3000/api/tools/slack-reader/execute \
  -H "X-User-ID: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "readChannel",
    "params": { "channel": "#general" }
  }'

# Expected: { success: true, data: [messages...] }
```

---

## Success Criteria

### Must Have (MVP):
- ✅ Agent can build Slack tool from natural language request
- ✅ OAuth flow completes successfully
- ✅ Tool executes and returns Slack messages
- ✅ Multiple tools can coexist in one MCP server
- ✅ Credentials stored securely in Raindrop
- ✅ Tool metadata tracked in Annotations

### Nice to Have:
- GitHub tool support
- Email tool support
- Tool update/refresh capability
- Better error messages
- Agent can handle edge cases autonomously

---

## Open Questions

1. **Code Execution Security**: Should we sandbox tool execution?
   - Current: Direct execution via dynamic import
   - Alternative: Isolated Worker threads

2. **Agent Model**: Which Claude model for ToolBuilderAgent?
   - Option A: Claude 3.5 Sonnet (balanced)
   - Option B: Claude Opus (more capable, slower)

3. **Template Strategy**: Should agent always generate fresh or use templates?
   - Current: Agent generates fresh, templates are references
   - Alternative: Templates as starting point, agent customizes

4. **Error Recovery**: How should agent handle failures?
   - Retry with different approach?
   - Fall back to simpler implementation?
   - Ask user for clarification?

---

**Status:** Ready for implementation
**Priority:** Day 2 focus after api/shared/ is complete
