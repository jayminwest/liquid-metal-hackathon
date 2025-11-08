# api/shared/ Architecture Plan
**Version:** 1.0
**Date:** November 8, 2025
**Status:** Planning Phase

---

## Executive Summary

The `api/shared/` layer provides common utilities, Raindrop CRUD operations, and user-scoped services for the hackathon project. It serves as the foundation for both `api/knowledge/` and `api/tooling/` layers, handling user context, MCP server management, and all interactions with Raindrop resources.

**Key Design Decisions:**
- User identification via simple userId (no auth, manual input)
- Middleware-based user context extraction (automatic scoping)
- All user data scoped with prefixes in shared Raindrop resources
- User-specific tooling stored as complete MCP servers in Raindrop Bucket
- Each user has ONE MCP server containing N tools
- OAuth tokens stored as plaintext in generated files (quick & dirty)
- **Claude Code SDK + Raindrop Orchestration**: Tools are built by Claude Code SDK agents using Raindrop's orchestration tooling as an MCP server, enabling AI-driven dynamic tool generation

---

## Architecture Overview

### Directory Structure

```
api/shared/
├── index.ts                      # Main Hono app with middleware & base routes
├── middleware/
│   ├── userContext.ts            # Extract userId, attach to ctx
│   └── errorHandler.ts           # Global error handling
├── services/
│   ├── raindrop.ts               # Low-level Raindrop MCP wrappers
│   ├── smartbucket.ts            # Knowledge storage operations
│   ├── smartmemory.ts            # Session memory operations
│   ├── annotation.ts             # Metadata/breadcrumb operations
│   ├── mcpRegistry.ts            # User MCP server discovery & loading
│   └── mcpStorage.ts             # Store/retrieve MCP server code from Raindrop
├── utils/
│   ├── userScoping.ts            # User prefix builders (getUserKey, getUserPath)
│   ├── validation.ts             # Input validation helpers
│   └── response.ts               # Standardized response builders
└── types/
    ├── env.ts                    # Environment bindings interface
    ├── context.ts                # Extended Hono context with userId
    ├── api.ts                    # Common API response types
    └── mcp.ts                    # MCP server & tool type definitions

api/tooling/
├── index.ts                      # Tooling API endpoints (/tools/create, /tools/execute)
├── agent/
│   ├── toolBuilderAgent.ts       # Claude Code SDK agent for building tools
│   ├── orchestrationClient.ts    # Client for Raindrop orchestration MCP server
│   └── agentPrompts.ts           # Prompts/instructions for tool-building agent
├── templates/
│   ├── slack.template.ts         # Slack MCP tool template (reference for agent)
│   ├── github.template.ts        # GitHub MCP tool template (reference for agent)
│   ├── email.template.ts         # Email MCP tool template (reference for agent)
│   └── base.template.ts          # Base MCP server structure template
├── builder/
│   ├── mcpBuilder.ts             # Coordinates agent-based tool building
│   ├── templateEngine.ts         # Injects user data into tool templates
│   └── toolMerger.ts             # Merges new tools into existing MCP server
├── oauth/
│   ├── slackOAuth.ts             # Slack OAuth flow handler
│   ├── githubOAuth.ts            # GitHub OAuth flow handler
│   └── oauthManager.ts           # Generic OAuth management
└── executor/
    └── mcpRunner.ts              # Loads & executes user MCP servers

api/knowledge/
├── index.ts                      # Knowledge API endpoints
├── basicMemory.ts                # Local basic-memory operations
└── sync.ts                       # Sync between basic-memory ↔ Raindrop

interaction/
└── [chat UI - not part of this plan]

data/
└── basic-memory/                 # Local storage (file-based)
    └── users/
        └── {userId}/             # Per-user knowledge files
```

---

## Raindrop Storage Strategy

### User MCP Servers (Bucket: "user-mcp-servers")
```
users/{userId}/mcp-server/
├── server.ts                 # Complete MCP server code with all tools
├── credentials.json          # OAuth tokens & API keys (plaintext)
└── metadata.json             # Server info (tool list, versions, etc.)
```

**Purpose:** Each user gets exactly ONE MCP server that contains all their custom tools. When a new tool is requested, it's merged into the existing server.

### Tool Templates (Bucket: "tool-templates")
```
templates/
├── slack/
│   ├── template.ts           # Slack MCP tool implementation template
│   └── schema.json           # Tool schema/configuration
├── github/
│   ├── template.ts
│   └── schema.json
└── email/
    ├── template.ts
    └── schema.json
```

**Purpose:** Shared templates used to generate user-specific tool implementations.

### User Tool Metadata (Annotations)
```
Annotations:
├── users/{userId}/mcp-server
│   → { status: 'active', toolCount: 3, lastUpdated: '...', mcpServerPath: '...' }
├── users/{userId}/tools/slack-reader
│   → { template: 'slack', status: 'active', oauthComplete: true, createdAt: '...' }
├── users/{userId}/tools/github-issues
│   → { template: 'github', status: 'active', oauthComplete: true, createdAt: '...' }
```

**Purpose:** Fast metadata lookups without loading full MCP server code. Tracks tool status, OAuth completion, creation dates.

### Knowledge Storage (SmartBucket: "user-knowledge")
```
users/{userId}/knowledge/
├── doc1.txt
├── doc2.pdf
└── ... (indexed for semantic search)
```

**Purpose:** Per-user knowledge base with semantic search capabilities. Synced from local basic-memory.

### Session Memory (SmartMemory: "agent-memory")
```
Working Memory Sessions:
├── users/{userId}/sessions/{sessionId} → conversation context

Episodic Memory:
├── users/{userId}/history/{summaryId} → past session summaries
```

**Purpose:** Agent conversation context and historical session summaries.

---

## Claude Code SDK + Raindrop Orchestration Integration

### Overview

Instead of using static templates, we leverage the **Claude Code SDK** with **Raindrop's orchestration tooling** exposed as an MCP server. This enables AI-driven, dynamic tool generation where an agent autonomously builds user-specific MCP tools based on natural language requests.

### Architecture Flow

```
User Request ("I want to read my Slack channels")
  ↓
api/tooling/index.ts (POST /api/tools/create)
  ↓
api/tooling/builder/mcpBuilder.ts
  ↓
Spawn Claude Code SDK Agent (toolBuilderAgent.ts)
  ↓
Agent has access to Raindrop Orchestration MCP Server:
  - mcp__raindrop-mcp__get-prompt (orchestration workflows)
  - mcp__raindrop-mcp__update-state (state transitions)
  - mcp__raindrop-mcp__jump-to-state (workflow control)
  - Standard Raindrop tools (put-object, get-object, etc.)
  ↓
Agent builds MCP tool code:
  1. Analyzes user's request (Slack integration)
  2. Generates MCP server tool definition
  3. Handles OAuth flow setup
  4. Writes tool code to Raindrop Bucket
  5. Updates user's MCP server with new tool
  ↓
Tool ready for execution
```

### Agent Workflow Components

**1. Tool Builder Agent (toolBuilderAgent.ts)**
- Claude Code SDK agent instance
- Has access to Raindrop orchestration MCP server
- Receives user request as prompt
- Autonomously generates tool code
- Handles edge cases and error scenarios

**2. Orchestration Client (orchestrationClient.ts)**
- Wraps Raindrop orchestration MCP tools
- Provides clean interface for agent to interact with workflows
- Manages session state for tool building process
- Tracks artifacts (generated code, credentials, metadata)

**3. Agent Prompts (agentPrompts.ts)**
- System prompts for tool builder agent
- Examples of well-formed MCP tools
- Guidelines for OAuth integration
- Best practices for tool generation

### Example: Agent Building a Slack Tool

```typescript
// User request comes in
POST /api/tools/create
{
  userId: 'user123',
  request: 'I want to read my Slack channels and DMs',
  context: 'I need to stay updated on team conversations'
}

// mcpBuilder.ts spawns agent
const agent = await spawnToolBuilderAgent({
  userId: 'user123',
  toolRequest: 'Slack channel and DM reader',
  userContext: 'team communication monitoring',
  existingMCPServer: userHasServer ? serverCode : null
});

// Agent uses orchestration workflow
const session = await orchestrationClient.startWorkflow('tool-builder');

// Agent executes with Raindrop MCP tools available:
// 1. Get prompt from orchestration
const { prompt, state } = await orchestrationClient.getPrompt(sessionId);

// 2. Agent generates tool code based on prompt
const toolCode = await agent.generateMCPTool({
  type: 'slack',
  capabilities: ['readChannels', 'readDMs'],
  authentication: 'oauth2'
});

// 3. Agent stores code in Raindrop
await orchestrationClient.putObject(
  'user-mcp-servers',
  `users/user123/mcp-server/tools/slack-reader.ts`,
  toolCode
);

// 4. Agent updates workflow state
await orchestrationClient.updateState(sessionId, timelineId, {
  artifacts: {
    toolId: 'slack-reader',
    toolCode: toolCode,
    oauthRequired: true
  },
  status: 'complete'
});

// 5. Get next workflow step (OAuth setup)
const { prompt: nextPrompt } = await orchestrationClient.getPrompt(sessionId);

// Agent continues autonomously until tool is complete
```

### Benefits of This Approach

1. **Dynamic Generation**: No hardcoded templates, agent can create novel integrations
2. **Context Awareness**: Agent understands user's specific needs from natural language
3. **Autonomous OAuth Setup**: Agent handles authentication flows without manual config
4. **Error Recovery**: Agent can debug and fix issues in generated code
5. **Evolving Tools**: Agent can update/extend existing tools based on new requests
6. **Workflow State Management**: Raindrop orchestration tracks progress and handles failures

### Integration with Existing Plan

The agent-based approach **enhances** the existing architecture:

- **Templates remain** as reference examples for the agent
- **mcpBuilder.ts** now coordinates agent execution instead of string manipulation
- **toolMerger.ts** still merges agent-generated code into user's MCP server
- **OAuth flows** are set up by agent, executed by existing oauth handlers
- **Storage layer** unchanged - agent uses same Raindrop services

### Agent Access to Raindrop Tools

The Claude Code SDK agent has access to these Raindrop MCP tools:

```typescript
// Orchestration tools
- mcp__raindrop-mcp__get-prompt
- mcp__raindrop-mcp__update-state
- mcp__raindrop-mcp__jump-to-state

// Storage tools (via api/shared services)
- put-object (store generated code)
- get-object (retrieve existing server)
- put-annotation (store metadata)
- get-annotation (check tool status)

// Memory tools (for context)
- put-memory (remember tool requirements)
- search-memory (recall past tool builds)

// Documentation tools
- fetch_documentation_page (learn MCP specs)
- fetch_architecture_pattern (follow best practices)
```

---

## Key Workflows

### 1. User Requests New Tool (Agent-Based)

```
User: "I want to read my Slack channels"
  ↓
POST /api/tools/create {
  userId: 'user123',
  request: 'I want to read my Slack channels and search messages',
  context: 'Need to monitor team discussions'
}
  ↓
api/tooling/builder/mcpBuilder.ts:
  1. Check if user has MCP server (query annotation: users/user123/mcp-server)

  2. Load existing server code if it exists:
     - Fetch from Bucket: users/user123/mcp-server/server.ts

  3. Spawn Claude Code SDK agent (toolBuilderAgent.ts):
     - Pass user request, context, existing server code
     - Give agent access to Raindrop orchestration MCP server
     - Provide system prompt with MCP tool guidelines

  4. Agent starts orchestration workflow:
     - Call mcp__raindrop-mcp__start-session()
     - Get initial prompt from orchestration

  5. Agent autonomously builds the tool:
     a) Analyzes user request ("Slack channel reader")
     b) Determines required capabilities (read channels, search)
     c) Generates MCP tool code with proper schema
     d) Identifies OAuth requirements
     e) Generates OAuth configuration
     f) Writes tool code to working memory (artifacts)

  6. Agent stores generated code:
     - Uses mcp__raindrop-mcp__put-object to save tool code
     - Path: users/user123/mcp-server/tools/slack-reader.ts

  7. Agent merges tool into existing server (or creates new server):
     - Loads base.template.ts if new server
     - Merges slack-reader tool into server.ts
     - Saves updated server: users/user123/mcp-server/server.ts

  8. Agent updates metadata:
     - Create annotation via mcp__raindrop-mcp__put-annotation
     - users/user123/tools/slack-reader → metadata
     - Update server annotation (toolCount++)

  9. Agent completes workflow:
     - mcp__raindrop-mcp__update-state with artifacts
     - status: 'complete', oauthRequired: true

  10. mcpBuilder.ts receives agent results:
      - toolId, toolCode, oauthConfig

  11. Initiate OAuth flow (slackOAuth.ts):
      - Generate OAuth URL based on agent's config
  ↓
Response: {
  success: true,
  toolId: 'slack-reader',
  oauthUrl: 'https://slack.com/oauth/authorize?...',
  status: 'pending_oauth',
  agentGenerated: true,
  capabilities: ['readChannels', 'searchMessages']
}

User completes OAuth:
  ↓
GET /api/tools/oauth/callback?code=xxx&state=user123:slack-reader
  ↓
api/tooling/oauth/slackOAuth.ts:
  1. Exchange code for access token
  2. Load credentials.json from Bucket
  3. Add/update Slack credentials: { slack: { accessToken: '...', teamId: '...' } }
  4. Save credentials.json back to Bucket
  5. Update tool annotation: status='active', oauthComplete=true
  ↓
Response: "OAuth complete! Your Slack tool is ready."
```

### 2. User Executes Tool

```
User: "Show me messages from #general"
  ↓
Agent interprets → POST /api/tools/execute
{
  userId: 'user123',
  toolId: 'slack-reader',
  action: 'readChannel',
  params: { channel: '#general' }
}
  ↓
api/tooling/executor/mcpRunner.ts:
  1. Load user's MCP server code from Bucket (users/user123/mcp-server/server.ts)

  2. Load credentials from credentials.json

  3. Dynamic import/eval the MCP server code
     - Pass credentials to server initialization

  4. Call the specific tool function:
     server.tools['slack-reader'].readChannel({ channel: '#general' })

  5. Return results
  ↓
Response: {
  success: true,
  data: [
    { user: 'alice', message: 'Hello team!', timestamp: '...' },
    { user: 'bob', message: 'Meeting at 3pm', timestamp: '...' }
  ]
}
```

### 3. Knowledge Sync (basic-memory ↔ Raindrop)

```
Agent adds knowledge locally via api/knowledge/
  ↓
POST /api/knowledge { userId: 'user123', content: '...', filename: 'doc1.txt' }
  ↓
api/knowledge/basicMemory.ts:
  1. Store in local basic-memory (data/basic-memory/users/user123/doc1.txt)
  ↓
api/knowledge/sync.ts (background process):
  1. Monitor basic-memory changes (file watcher or polling)

  2. Detect new/changed files in data/basic-memory/users/user123/

  3. Upload to SmartBucket via api/shared/services/smartbucket.ts:
     - Call storeKnowledge(user123, 'doc1.txt', content)
     - Stores at: users/user123/knowledge/doc1.txt
     - SmartBucket auto-indexes for semantic search

  4. Track sync status (last synced timestamp)
  ↓
Knowledge available in both locations:
- Local: data/basic-memory/users/user123/doc1.txt (fast access)
- Raindrop: users/user123/knowledge/doc1.txt (persistent, searchable)

Agent queries knowledge:
  ↓
GET /api/knowledge/search?userId=user123&q=project+planning
  ↓
api/knowledge/index.ts:
  1. First try local basic-memory (fast)
  2. If not found or semantic search needed, query Raindrop SmartBucket
  3. Return results
```

---

## api/shared/ Service Interfaces

### services/mcpRegistry.ts

```typescript
export class MCPRegistry {
  /**
   * Get user's MCP server metadata from annotations
   * Returns null if user has no MCP server yet
   */
  async getUserMCPServer(userId: string): Promise<MCPServerMetadata | null>

  /**
   * List all tools in user's MCP server
   * Queries annotations: users/{userId}/tools/*
   */
  async getUserTools(userId: string): Promise<ToolMetadata[]>

  /**
   * Check if user has a specific tool
   */
  async hasTool(userId: string, toolId: string): Promise<boolean>

  /**
   * Get specific tool metadata
   */
  async getToolMetadata(userId: string, toolId: string): Promise<ToolMetadata | null>
}
```

### services/mcpStorage.ts

```typescript
export class MCPStorage {
  /**
   * Save complete MCP server code to Raindrop Bucket
   * Path: users/{userId}/mcp-server/server.ts
   */
  async saveMCPServer(userId: string, code: string, metadata: any): Promise<void>

  /**
   * Load user's MCP server code from Raindrop Bucket
   * Returns both server code and credentials
   */
  async loadMCPServer(userId: string): Promise<{
    code: string,
    credentials: any,
    metadata: any
  } | null>

  /**
   * Update credentials.json in Raindrop
   * Path: users/{userId}/mcp-server/credentials.json
   */
  async saveCredentials(userId: string, credentials: any): Promise<void>

  /**
   * Get credentials for a specific tool
   * Loads credentials.json and returns tool-specific creds
   */
  async getCredentials(userId: string, toolId: string): Promise<any>

  /**
   * Update server metadata annotation
   * Annotation: users/{userId}/mcp-server
   */
  async updateMCPMetadata(userId: string, metadata: MCPServerMetadata): Promise<void>

  /**
   * Register new tool in annotations
   * Annotation: users/{userId}/tools/{toolId}
   */
  async registerTool(userId: string, toolId: string, metadata: ToolMetadata): Promise<void>

  /**
   * Delete tool from annotations and update server code
   */
  async deleteTool(userId: string, toolId: string): Promise<void>
}
```

### services/smartbucket.ts

```typescript
export class SmartBucketService {
  /**
   * Store knowledge document (scoped to user)
   * Path: users/{userId}/knowledge/{docId}
   */
  async storeKnowledge(userId: string, docId: string, content: any): Promise<void>

  /**
   * Search user's knowledge using semantic search
   * Queries SmartBucket with prefix: users/{userId}/knowledge/
   */
  async searchKnowledge(userId: string, query: string): Promise<SearchResult[]>

  /**
   * Get specific document
   */
  async getKnowledge(userId: string, docId: string): Promise<any>

  /**
   * Delete knowledge document
   */
  async deleteKnowledge(userId: string, docId: string): Promise<void>

  /**
   * List all user's knowledge documents
   */
  async listKnowledge(userId: string): Promise<string[]>

  /**
   * Batch upload knowledge (for sync)
   */
  async bulkStoreKnowledge(userId: string, documents: { docId: string, content: any }[]): Promise<void>
}
```

### services/smartmemory.ts

```typescript
export class SmartMemoryService {
  /**
   * Start new working memory session for user
   * Session ID format: users/{userId}/sessions/{timestamp}
   */
  async startSession(userId: string): Promise<{
    sessionId: string,
    workingMemory: ActorStub<SmartWorkingMemory>
  }>

  /**
   * Get existing session
   */
  async getSession(userId: string, sessionId: string): Promise<ActorStub<SmartWorkingMemory>>

  /**
   * Add memory to session
   */
  async addMemory(
    userId: string,
    sessionId: string,
    content: string,
    metadata?: { key?: string, agent?: string }
  ): Promise<void>

  /**
   * Get recent memories from session
   */
  async getMemories(
    userId: string,
    sessionId: string,
    options?: { nMostRecent?: number, timeline?: string }
  ): Promise<MemoryEntry[]>

  /**
   * Search session memories semantically
   */
  async searchMemories(
    userId: string,
    sessionId: string,
    query: string
  ): Promise<MemoryEntry[]>

  /**
   * End session (flush to episodic memory)
   */
  async endSession(userId: string, sessionId: string): Promise<void>

  /**
   * Search historical sessions (episodic memory)
   */
  async searchEpisodicMemory(
    userId: string,
    query: string,
    options?: { nMostRecent?: number }
  ): Promise<EpisodicSearchResult[]>
}
```

### services/annotation.ts

```typescript
export class AnnotationService {
  /**
   * Get annotation by MRN object
   */
  async getAnnotation(mrn: MRNObject): Promise<any>

  /**
   * Put annotation data
   */
  async putAnnotation(mrn: MRNObject, data: any): Promise<void>

  /**
   * List annotations with prefix
   */
  async listAnnotations(prefix: string): Promise<AnnotationEntry[]>

  /**
   * Delete annotation
   */
  async deleteAnnotation(mrn: MRNObject): Promise<void>

  /**
   * Helper: Build MRN for user-scoped annotation
   */
  buildUserMRN(userId: string, module: string, item?: string, key?: string): MRNObject
}
```

### services/raindrop.ts

```typescript
/**
 * Low-level wrappers around Raindrop MCP operations
 * These are thin wrappers that other services build upon
 */
export class RaindropService {
  /**
   * Bucket operations
   */
  async bucketPut(bucketName: keyof Env, key: string, content: any): Promise<void>
  async bucketGet(bucketName: keyof Env, key: string): Promise<any>
  async bucketDelete(bucketName: keyof Env, key: string): Promise<void>
  async bucketList(bucketName: keyof Env, options?: { prefix?: string }): Promise<string[]>

  /**
   * SmartBucket operations
   */
  async smartBucketSearch(bucketName: keyof Env, query: string, partition?: string): Promise<any>
  async smartBucketChunkSearch(bucketName: keyof Env, query: string, requestId: string): Promise<any>

  /**
   * SmartMemory operations
   */
  async memoryStartSession(): Promise<{ sessionId: string, workingMemory: any }>
  async memoryGetSession(sessionId: string): Promise<any>

  /**
   * Annotation operations
   */
  async annotationGet(mrn: MRNObject): Promise<any>
  async annotationPut(mrn: MRNObject, data: any): Promise<void>
  async annotationList(options?: any): Promise<any>
}
```

### services/agentOrchestration.ts

```typescript
/**
 * Service for managing Claude Code SDK agents with Raindrop orchestration
 * Provides clean interface for spawning and coordinating tool-building agents
 */
export class AgentOrchestrationService {
  /**
   * Start a new orchestration session for tool building
   */
  async startToolBuildSession(userId: string, toolRequest: string): Promise<{
    sessionId: string,
    timelineId: string
  }>

  /**
   * Get prompt from orchestration workflow
   */
  async getWorkflowPrompt(sessionId: string): Promise<{
    prompt: string,
    state: string,
    timeline_id: string
  }>

  /**
   * Update workflow state with artifacts
   */
  async updateWorkflowState(
    sessionId: string,
    timelineId: string,
    artifacts: Record<string, any>,
    status: 'complete' | 'failed' | 'blocked'
  ): Promise<void>

  /**
   * Jump to specific workflow state (for resuming)
   */
  async jumpToState(
    sessionId: string,
    targetState: string,
    mode: 'feature_addition' | 'debug'
  ): Promise<void>

  /**
   * End orchestration session
   */
  async endSession(sessionId: string, flush?: boolean): Promise<void>

  /**
   * Store artifact in session working memory
   */
  async storeArtifact(
    sessionId: string,
    key: string,
    value: any
  ): Promise<void>

  /**
   * Retrieve artifact from session working memory
   */
  async getArtifact(
    sessionId: string,
    key: string
  ): Promise<any>
}
```

---

## Utilities

### utils/userScoping.ts

```typescript
/**
 * Generate user-scoped keys for Raindrop storage
 */
export const getUserKey = (userId: string, ...parts: string[]): string =>
  `users/${userId}/${parts.join('/')}`;

/**
 * MCP server paths
 */
export const getMCPServerPath = (userId: string): string =>
  getUserKey(userId, 'mcp-server', 'server.ts');

export const getMCPCredentialsPath = (userId: string): string =>
  getUserKey(userId, 'mcp-server', 'credentials.json');

export const getMCPMetadataPath = (userId: string): string =>
  getUserKey(userId, 'mcp-server', 'metadata.json');

/**
 * Knowledge paths
 */
export const getKnowledgePath = (userId: string, docId: string): string =>
  getUserKey(userId, 'knowledge', docId);

export const getKnowledgePrefix = (userId: string): string =>
  getUserKey(userId, 'knowledge');

/**
 * Session memory paths
 */
export const getSessionPath = (userId: string, sessionId: string): string =>
  getUserKey(userId, 'sessions', sessionId);

/**
 * Tool annotation MRNs
 */
export const getMCPServerAnnotationMRN = (userId: string): MRNObject => ({
  module: 'mcp-server',
  item: userId,
  key: 'metadata'
});

export const getToolAnnotationMRN = (userId: string, toolId: string): MRNObject => ({
  module: 'tools',
  item: `${userId}_${toolId}`,
  key: 'metadata'
});

/**
 * Parse user-scoped key back into parts
 */
export const parseUserKey = (key: string): { userId: string, path: string } | null => {
  const match = key.match(/^users\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { userId: match[1], path: match[2] };
};
```

### utils/validation.ts

```typescript
/**
 * Validate userId format
 */
export const validateUserId = (userId: string): boolean => {
  return /^[a-zA-Z0-9_-]+$/.test(userId) && userId.length >= 3 && userId.length <= 50;
};

/**
 * Validate tool ID format
 */
export const validateToolId = (toolId: string): boolean => {
  return /^[a-z0-9-]+$/.test(toolId) && toolId.length >= 3 && toolId.length <= 50;
};

/**
 * Validate document ID format
 */
export const validateDocId = (docId: string): boolean => {
  return /^[a-zA-Z0-9_.-]+$/.test(docId) && docId.length >= 1 && docId.length <= 255;
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
```

### utils/response.ts

```typescript
/**
 * Standardized success response
 */
export const successResponse = (data: any, userId?: string) => ({
  success: true,
  data,
  userId,
  timestamp: new Date().toISOString()
});

/**
 * Standardized error response
 */
export const errorResponse = (message: string, code?: string, userId?: string) => ({
  success: false,
  error: {
    message,
    code: code || 'UNKNOWN_ERROR'
  },
  userId,
  timestamp: new Date().toISOString()
});

/**
 * Hono JSON response with status
 */
export const jsonResponse = (c: Context, data: any, status: number = 200) => {
  return c.json(data, status);
};
```

---

## Middleware

### middleware/userContext.ts

```typescript
import { Context, Next } from 'hono';
import { validateUserId } from '../utils/validation';
import { errorResponse } from '../utils/response';

/**
 * Extract userId from request and attach to context
 * Looks for userId in:
 * 1. Header: X-User-ID
 * 2. Query param: ?userId=xxx
 *
 * If not found or invalid, returns 400 error
 */
export const userContextMiddleware = async (c: Context, next: Next) => {
  const userIdFromHeader = c.req.header('X-User-ID');
  const userIdFromQuery = c.req.query('userId');

  const userId = userIdFromHeader || userIdFromQuery;

  if (!userId) {
    return c.json(errorResponse('Missing userId. Provide X-User-ID header or ?userId query param.', 'MISSING_USER_ID'), 400);
  }

  if (!validateUserId(userId)) {
    return c.json(errorResponse('Invalid userId format. Use alphanumeric, dash, underscore only (3-50 chars).', 'INVALID_USER_ID'), 400);
  }

  // Attach userId to context
  c.set('userId', userId);

  await next();
};
```

### middleware/errorHandler.ts

```typescript
import { Context } from 'hono';
import { errorResponse } from '../utils/response';

/**
 * Global error handler middleware
 * Catches unhandled errors and returns standardized error response
 */
export const errorHandlerMiddleware = async (c: Context, next: Function) => {
  try {
    await next();
  } catch (error: any) {
    console.error('Unhandled error:', error);

    const userId = c.get('userId');
    const errorMsg = error.message || 'Internal server error';
    const errorCode = error.code || 'INTERNAL_ERROR';

    return c.json(errorResponse(errorMsg, errorCode, userId), 500);
  }
};
```

---

## TypeScript Types

### types/env.ts

```typescript
import { Bucket, SmartBucket, SmartMemory, Annotation } from '@raindrop/types';

export interface Env {
  // Raindrop Resources (from manifest)
  USER_MCP_SERVERS: Bucket;           // Stores user MCP server code
  TOOL_TEMPLATES: Bucket;             // Shared tool templates
  USER_KNOWLEDGE: SmartBucket;        // User knowledge storage
  AGENT_MEMORY: SmartMemory;          // Session memory
  annotation: Annotation;             // Metadata storage

  // OAuth Secrets
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  OAUTH_REDIRECT_BASE: string;        // e.g., http://localhost:3000
}
```

### types/context.ts

```typescript
import { Context as HonoContext } from 'hono';
import { Env } from './env';

export type AppContext = HonoContext<{ Bindings: Env }>;

export interface ExtendedContext extends AppContext {
  get(key: 'userId'): string;
  set(key: 'userId', value: string): void;
}
```

### types/api.ts

```typescript
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
  userId?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends APIResponse<T> {
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}
```

### types/mcp.ts

```typescript
export interface MCPServerMetadata {
  userId: string;
  status: 'active' | 'inactive' | 'error';
  toolCount: number;
  lastUpdated: string;
  mcpServerPath: string;
  version: string;
}

export interface ToolMetadata {
  toolId: string;
  userId: string;
  template: string;                    // e.g., 'slack', 'github', 'email'
  status: 'pending_oauth' | 'active' | 'inactive' | 'error';
  oauthComplete: boolean;
  createdAt: string;
  lastUsed?: string;
  displayName?: string;
  description?: string;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
  schema?: any;
}

export interface MCPServer {
  userId: string;
  tools: Record<string, MCPTool>;
  metadata: MCPServerMetadata;
}

export interface ToolTemplate {
  templateId: string;
  name: string;
  description: string;
  requiredCredentials: string[];      // e.g., ['accessToken', 'teamId']
  codeTemplate: string;               // Template string with placeholders
  schema: any;
}
```

---

## API Endpoints

### api/shared/index.ts (Base Endpoints)

```
GET  /health
     Response: { status: 'ok', timestamp: '...' }

GET  /api/user/context
     Headers: X-User-ID: user123
     Response: { success: true, userId: 'user123', ... }

GET  /api/raindrop/test
     Description: Test Raindrop connectivity
     Response: { success: true, message: 'Raindrop connected' }
```

### api/knowledge/index.ts

```
POST   /api/knowledge
       Headers: X-User-ID: user123
       Body: { filename: 'doc1.txt', content: '...' }
       Response: { success: true, docId: 'doc1.txt', synced: false }

GET    /api/knowledge/search
       Headers: X-User-ID: user123
       Query: ?q=project+planning
       Response: { success: true, data: [...results] }

GET    /api/knowledge/:id
       Headers: X-User-ID: user123
       Response: { success: true, data: { content: '...', ... } }

DELETE /api/knowledge/:id
       Headers: X-User-ID: user123
       Response: { success: true, deleted: 'doc1.txt' }

GET    /api/sync/status
       Headers: X-User-ID: user123
       Response: { success: true, lastSync: '...', pending: 3 }

POST   /api/sync/trigger
       Headers: X-User-ID: user123
       Response: { success: true, synced: 5, failed: 0 }
```

### api/tooling/index.ts

```
POST   /api/tools/create
       Headers: X-User-ID: user123
       Body: { toolName: 'Slack Reader', type: 'slack', description: '...' }
       Response: { success: true, toolId: 'slack-reader', oauthUrl: '...', status: 'pending_oauth' }

GET    /api/tools
       Headers: X-User-ID: user123
       Response: { success: true, data: [...tools] }

GET    /api/tools/:id
       Headers: X-User-ID: user123
       Response: { success: true, data: { toolId: '...', status: '...', ... } }

POST   /api/tools/:id/execute
       Headers: X-User-ID: user123
       Body: { action: 'readChannel', params: { channel: '#general' } }
       Response: { success: true, data: [...messages] }

DELETE /api/tools/:id
       Headers: X-User-ID: user123
       Response: { success: true, deleted: 'slack-reader' }

GET    /api/tools/oauth/callback
       Query: ?code=xxx&state=user123:slack-reader
       Response: HTML or redirect with success message
```

---

## Environment Bindings Configuration

### raindrop.manifest (Root Project)

```hcl
application "hackathon-agent" {
  # User MCP Servers storage
  bucket "user-mcp-servers" {}

  # Tool templates (shared)
  bucket "tool-templates" {}

  # User knowledge with semantic search
  smartbucket "user-knowledge" {}

  # Agent session memory
  smartmemory "agent-memory" {}

  # Annotations automatically available via env.annotation

  # Secrets for OAuth
  secret "SLACK_CLIENT_ID"
  secret "SLACK_CLIENT_SECRET"
  secret "GITHUB_CLIENT_ID"
  secret "GITHUB_CLIENT_SECRET"
  secret "OAUTH_REDIRECT_BASE"
}
```

---

## Implementation Order

### Phase 1: Foundation (Day 1, Morning)
1. **Types & Interfaces** (`types/`)
   - [ ] env.ts
   - [ ] context.ts
   - [ ] api.ts
   - [ ] mcp.ts

2. **Utilities** (`utils/`)
   - [ ] userScoping.ts (key builders, MRN builders)
   - [ ] validation.ts
   - [ ] response.ts

3. **Middleware** (`middleware/`)
   - [ ] userContext.ts
   - [ ] errorHandler.ts

### Phase 2: Raindrop Services (Day 1, Afternoon)
4. **Base Raindrop Service** (`services/`)
   - [ ] raindrop.ts (low-level wrappers)
   - [ ] annotation.ts

5. **Storage Services** (`services/`)
   - [ ] smartbucket.ts (knowledge storage)
   - [ ] smartmemory.ts (session memory)

### Phase 3: MCP Services (Day 1, Evening)
6. **MCP Services** (`services/`)
   - [ ] mcpStorage.ts (store/load MCP servers)
   - [ ] mcpRegistry.ts (discover tools)
   - [ ] agentOrchestration.ts (orchestration client)

### Phase 4: Agent Components (Day 2, Morning)
7. **Agent Infrastructure** (`api/tooling/agent/`)
   - [ ] agentPrompts.ts (system prompts for agent)
   - [ ] orchestrationClient.ts (Raindrop orchestration wrapper)
   - [ ] toolBuilderAgent.ts (Claude Code SDK agent)

8. **Tool Builder** (`api/tooling/builder/`)
   - [ ] mcpBuilder.ts (coordinates agent execution)
   - [ ] toolMerger.ts (merges generated code)

### Phase 5: API Routes & Testing (Day 2, Afternoon)
9. **Shared API Routes** (`index.ts`)
   - [ ] Health check endpoint
   - [ ] User context test endpoint
   - [ ] Raindrop connectivity test

10. **Tooling API Routes** (`api/tooling/index.ts`)
    - [ ] POST /api/tools/create (agent-based)
    - [ ] GET /api/tools (list tools)
    - [ ] POST /api/tools/:id/execute

11. **Testing**
    - [ ] Manual tests with curl/Postman
    - [ ] Verify user context middleware
    - [ ] Test Raindrop operations
    - [ ] Test agent-based tool creation
    - [ ] Verify OAuth flow integration

---

## Testing Strategy

### Manual Testing Checklist

1. **User Context Middleware**
   ```bash
   # Missing userId
   curl http://localhost:3000/api/user/context
   # Expected: 400 error

   # Valid userId in header
   curl -H "X-User-ID: user123" http://localhost:3000/api/user/context
   # Expected: 200 with userId

   # Valid userId in query
   curl http://localhost:3000/api/user/context?userId=user123
   # Expected: 200 with userId
   ```

2. **Raindrop Connectivity**
   ```bash
   curl -H "X-User-ID: user123" http://localhost:3000/api/raindrop/test
   # Expected: Success message if Raindrop connected
   ```

3. **Knowledge Storage**
   ```bash
   # Add knowledge
   curl -X POST -H "X-User-ID: user123" \
     -H "Content-Type: application/json" \
     -d '{"filename":"test.txt","content":"Hello world"}' \
     http://localhost:3000/api/knowledge

   # Search knowledge
   curl -H "X-User-ID: user123" \
     http://localhost:3000/api/knowledge/search?q=hello
   ```

4. **Tool Creation**
   ```bash
   # Create tool
   curl -X POST -H "X-User-ID: user123" \
     -H "Content-Type: application/json" \
     -d '{"toolName":"Slack Reader","type":"slack"}' \
     http://localhost:3000/api/tools/create

   # List tools
   curl -H "X-User-ID: user123" http://localhost:3000/api/tools
   ```

---

## Success Criteria

### Must Have (MVP)
- ✅ User context middleware working (extract userId from header/query)
- ✅ All Raindrop services operational (SmartBucket, SmartMemory, Annotation)
- ✅ User-scoped key generation working correctly
- ✅ MCP server storage/retrieval from Raindrop Bucket
- ✅ Tool metadata stored in Annotations
- ✅ Basic error handling and validation

### Nice to Have
- Comprehensive input validation for all endpoints
- Request logging and debugging helpers
- Caching layer for frequently accessed data
- Retry logic for Raindrop operations
- Better error messages with troubleshooting hints

---

## Open Questions / Decisions Needed

1. **Raindrop Resource Names**: Need to confirm exact names for:
   - SmartBucket for knowledge
   - SmartMemory for sessions
   - Bucket names for MCP servers and templates

2. **MCP Server Execution**: How to handle dynamic import/eval of user MCP server code?
   - Option A: Use `eval()` (quick but risky)
   - Option B: Use Bun's dynamic `import()` with data URLs
   - Option C: Write to temp file and import

3. **Credentials Security**: Even for hackathon, should we add basic encryption?
   - Option A: Plaintext (fastest)
   - Option B: Simple base64 encoding (obscurity)
   - Option C: Proper encryption with user-specific keys

4. **Sync Strategy**: Should knowledge sync be:
   - Option A: Immediate (on every add/update)
   - Option B: Periodic background job (every 30s)
   - Option C: Manual trigger only

5. **Error Recovery**: How to handle partial failures?
   - Example: Tool added to MCP server but annotation write fails
   - Should we implement rollback logic or just log and continue?

---

## Dependencies

### Required Packages
```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@raindrop/sdk": "latest",
    "@anthropic-ai/sdk": "latest",
    "@modelcontextprotocol/sdk": "latest"
  },
  "devDependencies": {
    "bun-types": "latest",
    "@types/node": "latest"
  }
}
```

### Claude Code SDK Setup
- Install Claude Code SDK for agent orchestration
- Configure MCP server access for agents
- Set up Raindrop orchestration MCP server as available tool
- Provide agent with access to Raindrop documentation via MCP tools

### Raindrop Resources Required
- 2x Buckets (user-mcp-servers, tool-templates)
- 1x SmartBucket (user-knowledge)
- 1x SmartMemory (agent-memory)
- Annotations (automatically available)

---

## Notes

- **User Isolation**: All data scoped with `users/{userId}/` prefix
- **Quick & Dirty**: OAuth tokens stored as plaintext in credentials.json for hackathon speed
- **Single MCP Server per User**: Each user has exactly one MCP server containing all their tools
- **Middleware-Based Context**: userId automatically available in all handlers via `c.get('userId')`
- **Raindrop-First**: All persistent data lives in Raindrop, local basic-memory is cache/sync source
- **Agent-Driven Tool Building**: Claude Code SDK agents with Raindrop orchestration MCP server build tools dynamically
- **No Static Templates**: Templates are reference examples; agents generate fresh code based on user requests
- **Autonomous Workflows**: Agents handle the entire tool creation process from request analysis to code generation

---

## Agent Workflow Details

### Tool Builder Agent Configuration

The Claude Code SDK agent is configured with:

1. **System Prompt** (agentPrompts.ts):
   ```
   You are a tool builder agent. Your job is to create MCP server tools based on user requests.

   You have access to:
   - Raindrop orchestration workflow tools
   - Raindrop storage (buckets, annotations)
   - Reference templates for common integrations
   - MCP specification documentation

   Your workflow:
   1. Analyze the user's tool request
   2. Determine required capabilities and APIs
   3. Generate MCP-compliant tool code
   4. Set up OAuth configuration if needed
   5. Merge tool into user's MCP server
   6. Store metadata in annotations
   7. Report completion with artifacts

   Always follow MCP best practices and ensure tools are secure and well-documented.
   ```

2. **Available MCP Tools**:
   - Raindrop orchestration (get-prompt, update-state, jump-to-state)
   - Raindrop storage (put-object, get-object, list-objects)
   - Raindrop annotations (put-annotation, get-annotation)
   - Raindrop documentation (fetch_documentation_page)

3. **Context Provided**:
   - User's natural language request
   - User's existing MCP server code (if any)
   - User's existing tools (to avoid conflicts)
   - Reference templates for guidance

### Agent Execution Flow

```
1. Agent receives task:
   - User request: "I want to read my Slack channels"
   - Existing server code (if user has tools already)
   - User context: "monitoring team discussions"

2. Agent starts orchestration session:
   - Calls mcp__raindrop-mcp__start-session()
   - Receives sessionId and initial workflow prompt

3. Agent follows workflow steps:
   a) Analyze request (determine: Slack integration needed)
   b) Research Slack API (using memory or web search if available)
   c) Generate MCP tool schema
   d) Generate tool implementation code
   e) Create OAuth configuration
   f) Validate generated code

4. Agent stores artifacts:
   - Generated tool code → working memory
   - OAuth config → working memory
   - Tool metadata → working memory

5. Agent updates workflow state:
   - mcp__raindrop-mcp__update-state with artifacts
   - Status: 'complete' or 'blocked' if issues found

6. Agent stores code in Raindrop:
   - mcp__raindrop-mcp__put-object to save tool code
   - mcp__raindrop-mcp__put-annotation for metadata

7. Agent completes:
   - Returns artifacts to mcpBuilder.ts
   - mcpBuilder.ts initiates OAuth flow
   - Tool is ready for use after OAuth
```

### Error Handling in Agent Workflow

If the agent encounters errors:
- **API unavailable**: Agent suggests alternative APIs or manual configuration
- **OAuth setup unclear**: Agent marks tool as 'needs_manual_config' and provides instructions
- **Code generation fails**: Agent retries with different approach or simpler implementation
- **Workflow blocked**: Agent updates state as 'blocked' with detailed error message

The orchestration workflow ensures all errors are tracked and recoverable.

---

**Last Updated:** November 8, 2025
**Status:** Ready for Implementation (with Agent Integration)
