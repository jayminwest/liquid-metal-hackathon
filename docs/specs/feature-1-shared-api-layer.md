# Feature Plan: Shared API Layer with Raindrop Services

## Overview
Implement the foundational `api/shared/` layer providing common utilities, Raindrop CRUD operations, user-scoped services, and middleware for the hackathon project. This layer serves as the foundation for both `api/knowledge/` and `api/tooling/` layers, enabling user context extraction, MCP server management, and all interactions with Raindrop resources.

**CRITICAL: Preserve Existing Work**
This implementation must preserve all existing functionality created by another developer:
- ✅ **KEEP** all existing types in `types.ts` (KnowledgeEntry, Relation, Observation, QueryRequest, QueryResult, GraphData, GraphNode, GraphEdge, CaptureResponse, SummarizeRequest, SummarizeResponse, SuggestedConnection, MCPClientConfig, UserSession)
- ✅ **KEEP** `basicMemory.ts` completely untouched - this is the knowledge layer integration
- ✅ **KEEP** existing RaindropClient method signatures in `raindrop.ts`
- ✅ **KEEP** existing health check and CRUD endpoints in `index.ts`
- ⚠️ **ENHANCE** (don't replace) existing placeholder implementations with real MCP calls
- ✨ **ADD** new functionality alongside existing work

## Issue Relationships
- **Related To**: Complete architectural documentation in PRD.md and SHARED_API_PLAN.md
- **Blocks**: Future implementation of `api/knowledge/` and `api/tooling/` layers - Provides foundational services required for both

## Existing Functionality (DO NOT MODIFY)

The following files and functionality already exist and are owned by another developer:

### `api/shared/basicMemory.ts`
**Status**: Complete - Do not modify
**Purpose**: Integration with basic-memory MCP server for local knowledge storage
**Exports**: `BasicMemoryClient` class with methods:
- Note operations: `writeNote`, `readNote`, `editNote`, `deleteNote`
- Search: `buildContext`, `query`, `recentActivity`
- Visualization: `canvas`
- Projects: `listProjects`, `createProject`, `getCurrentProject`, `listDirectory`

### `api/shared/types.ts` (Partial - Knowledge Graph Types)
**Status**: Existing types must be preserved
**Contains**: Knowledge graph type definitions for the `api/knowledge/` layer
**Existing Types**:
- `KnowledgeEntry` - Core knowledge entity structure
- `Relation` - Relations between entities
- `Observation` - Observations about entities
- `QueryRequest`, `QueryResult` - Query operations
- `Source` - Source attribution
- `GraphData`, `GraphNode`, `GraphEdge` - Graph visualization
- `CaptureResponse` - Capture operation responses
- `SummarizeRequest`, `SummarizeResponse`, `SuggestedConnection` - Summarization
- `MCPClientConfig` - MCP client configuration
- `UserSession` - User session management

**Action**: Add new types for user context, MCP servers, and API responses WITHOUT removing existing types

### `api/shared/raindrop.ts` (Partial - Method Signatures)
**Status**: Placeholder implementation - enhance with real MCP calls
**Contains**: `RaindropClient` class with placeholder methods
**Existing Methods** (KEEP signatures, replace console.log with real calls):
- Working Memory: `putMemory`, `getMemory`, `searchMemory`, `summarizeMemory`
- SmartBucket: `documentSearch`, `chunkSearch`, `documentQuery`
- SmartSQL: `sqlExecuteQuery`, `sqlGetMetadata`
- Session: `startSession`, `endSession`

**Action**: Add new methods for Bucket/Annotation operations and replace placeholder implementations with actual MCP tool calls

### `api/shared/index.ts` (Partial - Basic Routes)
**Status**: Basic Hono app with placeholder routes
**Existing Routes**:
- `GET /health` - Health check endpoint
- `GET /raindrop` - Get all items placeholder
- `GET /raindrop/:id` - Get item by ID placeholder
- `POST /raindrop` - Create item placeholder
- `PUT /raindrop/:id` - Update item placeholder
- `DELETE /raindrop/:id` - Delete item placeholder

**Action**: Add user context middleware and new API routes while preserving existing routes

## Technical Approach

### Architecture Changes
This feature establishes the complete `api/shared/` layer with the following structure:

```
api/shared/
├── index.ts                      # Main Hono app with middleware & base routes
├── middleware/
│   ├── userContext.ts            # Extract userId from headers/query params
│   └── errorHandler.ts           # Global error handling middleware
├── services/
│   ├── raindrop.ts               # Low-level Raindrop MCP wrappers (ENHANCE EXISTING)
│   ├── smartbucket.ts            # Knowledge storage operations
│   ├── smartmemory.ts            # Session memory operations
│   ├── annotation.ts             # Metadata/breadcrumb operations
│   ├── mcpRegistry.ts            # User MCP server discovery & loading
│   └── mcpStorage.ts             # Store/retrieve MCP server code from Raindrop
├── utils/
│   ├── userScoping.ts            # User prefix builders (getUserKey, getMCPServerPath)
│   ├── validation.ts             # Input validation helpers
│   └── response.ts               # Standardized response builders
└── types/
    ├── env.ts                    # Environment bindings interface
    ├── context.ts                # Extended Hono context with userId
    ├── api.ts                    # Common API response types
    └── mcp.ts                    # MCP server & tool type definitions
```

**Key Design Decisions:**
- User identification via simple userId (no auth, manual input for hackathon)
- Middleware-based user context extraction (`X-User-ID` header or `?userId` query param)
- All user data scoped with `users/{userId}/` prefixes in Raindrop resources
- User-specific MCP servers stored as complete server code in Raindrop Bucket
- Each user has ONE MCP server containing N tools
- OAuth tokens stored as plaintext in credentials.json (quick & dirty hackathon approach)
- Claude Code SDK agents + Raindrop orchestration for AI-driven dynamic tool generation

### Integration Points

**Existing Files to Enhance:**
- `api/shared/raindrop.ts` - Expand from placeholder to full wrapper with actual MCP tool calls
- `api/shared/types.ts` - Add new types for user context, MCP servers, and API responses
- `api/shared/index.ts` - Add user context middleware and expand endpoints

**Raindrop MCP Tools Integration:**
Uses these MCP tools (available from Claude Code environment):
- `mcp__raindrop-mcp__put-object` - Store MCP server code
- `mcp__raindrop-mcp__get-object` - Retrieve MCP server code
- `mcp__raindrop-mcp__list-objects` - List user resources
- `mcp__raindrop-mcp__delete-object` - Remove resources
- `mcp__raindrop-mcp__put-annotation` - Store tool metadata
- `mcp__raindrop-mcp__get-annotation` - Retrieve tool metadata
- `mcp__raindrop-mcp__list-annotations` - List user tools
- `mcp__raindrop-mcp__put-memory` - Store session memory
- `mcp__raindrop-mcp__get-memory` - Retrieve session memory
- `mcp__raindrop-mcp__search-memory` - Semantic search
- `mcp__raindrop-mcp__create-smartbucket` - Initialize user knowledge storage
- `mcp__raindrop-mcp__document-search` - Search knowledge base
- `mcp__raindrop-mcp__start-session` - Create working memory session
- `mcp__raindrop-mcp__end-session` - End working memory session
- `mcp__raindrop-mcp__get-prompt` - Orchestration workflow prompts
- `mcp__raindrop-mcp__update-state` - Orchestration state transitions
- `mcp__raindrop-mcp__jump-to-state` - Orchestration workflow control

### Data Model

**Raindrop Storage Strategy:**

1. **User MCP Servers (Bucket: "user-mcp-servers")**
   ```
   users/{userId}/mcp-server/
   ├── server.ts                 # Complete MCP server code with all tools
   ├── credentials.json          # OAuth tokens & API keys (plaintext)
   └── metadata.json             # Server info (tool list, versions, etc.)
   ```

2. **Tool Templates (Bucket: "tool-templates")**
   ```
   templates/
   ├── slack/template.ts
   ├── github/template.ts
   └── email/template.ts
   ```

3. **User Tool Metadata (Annotations)**
   - `users/{userId}/mcp-server` → Server status, tool count, last updated
   - `users/{userId}/tools/{toolId}` → Tool status, OAuth completion, creation date

4. **Knowledge Storage (SmartBucket: "user-knowledge")**
   - `users/{userId}/knowledge/` → Per-user knowledge with semantic search

5. **Session Memory (SmartMemory: "agent-memory")**
   - `users/{userId}/sessions/{sessionId}` → Conversation context
   - `users/{userId}/history/{summaryId}` → Past session summaries

**Type Definitions:**

```typescript
// types/env.ts
export interface Env {
  USER_MCP_SERVERS: R2Bucket;
  TOOL_TEMPLATES: R2Bucket;
  USER_KNOWLEDGE: SmartBucket;
  AGENT_MEMORY: SmartMemory;
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

// types/context.ts
export interface UserContext {
  userId: string;
}

export type AppContext = {
  Variables: {
    user: UserContext;
  };
};

// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// types/mcp.ts
export interface MCPServer {
  userId: string;
  serverCode: string;
  tools: MCPTool[];
  credentialsPath: string;
  metadata: MCPServerMetadata;
}

export interface MCPTool {
  id: string;
  name: string;
  template: string;
  status: 'active' | 'inactive' | 'auth_required';
  oauthComplete: boolean;
  createdAt: string;
}

export interface MCPServerMetadata {
  toolCount: number;
  lastUpdated: string;
  status: 'active' | 'inactive';
}
```

## Relevant Files

### Files to Modify

**IMPORTANT: Preserve Existing Work**
The following files contain work from another developer that MUST be preserved:

- `api/shared/types.ts` - **PRESERVE** existing knowledge graph types (KnowledgeEntry, Relation, Observation, QueryRequest, QueryResult, GraphData, etc.). ADD new types for user context, MCP, and API responses alongside existing types.

- `api/shared/raindrop.ts` - **PRESERVE** existing RaindropClient class structure and method signatures. ENHANCE placeholder methods (currently console.log) with actual MCP tool calls. Keep all existing method names and parameters.

- `api/shared/basicMemory.ts` - **PRESERVE ENTIRELY** - This is the other developer's basic-memory integration. Do not modify this file as part of this issue.

- `api/shared/index.ts` - **PRESERVE** existing health check endpoint and CRUD routes. ADD user context middleware and expand with new routes.

- `package.json` - Add missing dependencies (@anthropic-ai/sdk, @modelcontextprotocol/sdk if needed)

### New Files
- `api/shared/middleware/userContext.ts` - User context extraction middleware
- `api/shared/middleware/errorHandler.ts` - Global error handler
- `api/shared/services/smartbucket.ts` - Knowledge storage service
- `api/shared/services/smartmemory.ts` - Session memory service
- `api/shared/services/annotation.ts` - Annotation/metadata service
- `api/shared/services/mcpStorage.ts` - MCP server storage operations
- `api/shared/services/mcpRegistry.ts` - MCP server discovery and registry
- `api/shared/utils/userScoping.ts` - User scoping utilities
- `api/shared/utils/validation.ts` - Input validation helpers
- `api/shared/utils/response.ts` - Response formatting utilities
- `api/shared/types/env.ts` - Environment bindings
- `api/shared/types/context.ts` - User context types
- `api/shared/types/api.ts` - API response types
- `api/shared/types/mcp.ts` - MCP server and tool types

## Task Breakdown

### 1. Foundation - Type Definitions (Effort: small)
- Description: Define all TypeScript interfaces and types for the shared layer. **PRESERVE existing types in types.ts** (KnowledgeEntry, Relation, Observation, etc.) and ADD new types alongside them.
- Files: `types/env.ts` (new), `types/context.ts` (new), `types/api.ts` (new), `types/mcp.ts` (new), `types.ts` (modify - add types, preserve existing)
- Validation: TypeScript compilation passes, all existing types still exported
- Dependencies: None

### 2. Utilities Layer (Effort: small)
- Description: Implement user scoping, validation, and response utilities
- Files: `utils/userScoping.ts`, `utils/validation.ts`, `utils/response.ts`
- Validation: Unit tests pass, lint/typecheck clean
- Dependencies: Task 1 (types)

### 3. Middleware Implementation (Effort: small)
- Description: Build user context extraction and error handling middleware
- Files: `middleware/userContext.ts`, `middleware/errorHandler.ts`
- Validation: Test with curl showing userId extraction from headers and query params
- Dependencies: Task 1, 2 (types, utilities)

### 4. Enhanced Raindrop Service (Effort: medium)
- Description: Replace placeholder methods in raindrop.ts with actual MCP tool calls. **PRESERVE all existing method signatures and add missing Bucket/Annotation operations.**
- Files: `raindrop.ts` (modify - keep class structure, enhance methods, add new methods)
- Validation: Real MCP calls succeed, can store/retrieve from Raindrop, all existing method signatures unchanged
- Dependencies: Task 1 (types)

### 5. Annotation Service (Effort: small)
- Description: Implement MRN-based annotation/metadata operations with user scoping
- Files: `services/annotation.ts`
- Validation: Can create/retrieve annotations with user-scoped paths
- Dependencies: Task 1, 2, 4 (types, utilities, raindrop)

### 6. SmartBucket Service (Effort: medium)
- Description: Implement user-scoped knowledge storage operations
- Files: `services/smartbucket.ts`
- Validation: Can create user buckets, store/search knowledge with user prefixes
- Dependencies: Task 1, 2, 4 (types, utilities, raindrop)

### 7. SmartMemory Service (Effort: medium)
- Description: Implement session memory operations with user scoping
- Files: `services/smartmemory.ts`
- Validation: Can create sessions, store/retrieve/search memories per user
- Dependencies: Task 1, 2, 4 (types, utilities, raindrop)

### 8. MCP Storage Service (Effort: medium)
- Description: Implement MCP server storage/retrieval from Raindrop Buckets
- Files: `services/mcpStorage.ts`
- Validation: Can store/load user MCP servers and credentials from Raindrop
- Dependencies: Task 1, 2, 4 (types, utilities, raindrop)

### 9. MCP Registry Service (Effort: medium)
- Description: Implement tool discovery and listing using annotations
- Files: `services/mcpRegistry.ts`
- Validation: Can list user tools, check tool status, validate tool metadata
- Dependencies: Task 1, 2, 5 (types, utilities, annotation)

### 10. API Routes & Integration (Effort: medium)
- Description: Update index.ts with middleware and test endpoints. **PRESERVE existing health check and /raindrop CRUD routes.**
- Files: `index.ts` (modify - add middleware, add new routes, preserve existing routes)
- Validation: All endpoints respond correctly with user context, existing routes still functional
- Dependencies: All previous tasks

### 11. Integration Testing (Effort: medium)
- Description: End-to-end testing of all services with real Raindrop MCP
- Files: Create test files or manual curl commands
- Validation: Complete user flow works (context → services → Raindrop → response)
- Dependencies: All previous tasks

## Step by Step Tasks

Ordered implementation sequence:

1. Create all type definition files (env.ts, context.ts, api.ts, mcp.ts)
2. Implement utility modules (userScoping.ts, validation.ts, response.ts)
3. Build middleware (userContext.ts, errorHandler.ts)
4. Enhance existing raindrop.ts with real MCP tool calls
5. Implement annotation service
6. Implement smartbucket service
7. Implement smartmemory service
8. Implement mcpStorage service
9. Implement mcpRegistry service
10. Update index.ts with middleware and expanded routes
11. Add health check endpoint
12. Add user context test endpoint
13. Add Raindrop connectivity test endpoint
14. Test with curl/Postman for user context middleware
15. Test Raindrop service operations
16. Validate user scoping (ensure isolation between users)
17. Document API endpoints and usage

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| MCP tool availability in environment | High | Verify all required MCP tools are accessible before implementation |
| User scoping path inconsistencies | High | Centralize all path building in userScoping.ts utilities |
| Raindrop quota/rate limits during hackathon | Medium | Implement retry logic with exponential backoff |
| OAuth token plaintext storage security | Low | Document as hackathon shortcut, plan encrypted storage for production |
| Complex service interdependencies | Medium | Implement services in dependency order, test each layer independently |
| Missing environment bindings configuration | High | Create raindrop.manifest early, validate bindings exist |

## Validation Strategy

### Validation Level: 2 (Integration)

**Justification**: This is a foundational API layer with external service integration (Raindrop MCP). Integration testing is essential to verify real MCP operations work correctly. Not config-only (requires Level 1), and not schema changes or auth (doesn't require Level 3).

### Validation Commands
```bash
# Level 1 checks
bun run lint
bun run typecheck

# Level 2 integration tests
bun test --filter integration

# Manual integration testing
curl -X GET http://localhost:3000/health
curl -H "X-User-ID: user123" http://localhost:3000/api/user/context
curl -H "X-User-ID: user123" http://localhost:3000/api/raindrop/test
```

### Real-Service Evidence (Level 2)
Capture evidence of successful Raindrop MCP integration:

**Required Evidence:**
1. **Bucket Operations**: Store/retrieve MCP server code from `user-mcp-servers` bucket
   - PUT object with user-scoped path `users/user123/mcp-server/server.ts`
   - GET object retrieval confirmation
   - Console output showing success

2. **Annotation Operations**: Create/retrieve tool metadata
   - PUT annotation for `users/user123/mcp-server` with metadata
   - GET annotation retrieval showing correct metadata
   - Console output showing annotation ID

3. **SmartBucket Operations**: Create user knowledge bucket and store document
   - Create SmartBucket with name `user-knowledge`
   - PUT document with user-scoped path
   - Document search confirmation

4. **SmartMemory Operations**: Session creation and memory storage
   - Start session call showing session_id
   - PUT memory with user-scoped key
   - GET memory retrieval showing stored content
   - Search memory with semantic query

5. **Middleware Operations**: User context extraction
   - Request with `X-User-ID` header shows userId in response
   - Request with `?userId=` query param shows userId in response
   - Request with missing userId shows error

**Example Evidence Format:**
```
[2025-11-08T14:23:45] PUT /api/raindrop/test
  → mcp__raindrop-mcp__put-object(bucket: "user-mcp-servers", key: "users/user123/mcp-server/test.ts")
  → Success: object stored at users/user123/mcp-server/test.ts

[2025-11-08T14:23:46] GET /api/raindrop/test
  → mcp__raindrop-mcp__get-object(bucket: "user-mcp-servers", key: "users/user123/mcp-server/test.ts")
  → Success: retrieved content (127 bytes)

[2025-11-08T14:23:47] POST /api/raindrop/annotation
  → mcp__raindrop-mcp__put-annotation(annotation_id: "users/user123/tools/test-tool", content: "...")
  → Success: annotation created

[2025-11-08T14:23:48] GET /api/user/context (X-User-ID: user123)
  → Middleware extracted userId: user123
  → Response: { "userId": "user123", "timestamp": "..." }
```

## Success Criteria
- [ ] All TypeScript type definitions compile without errors
- [ ] User context middleware successfully extracts userId from headers and query params
- [ ] User context middleware rejects requests with missing or invalid userId
- [ ] RaindropService successfully stores and retrieves objects from Raindrop buckets
- [ ] AnnotationService creates and retrieves user-scoped annotations
- [ ] SmartBucketService creates user buckets and stores knowledge documents
- [ ] SmartMemoryService creates sessions and manages user memory
- [ ] MCPStorage stores and loads user MCP server code
- [ ] MCPRegistry lists user tools and metadata
- [ ] All services properly scope data with user prefixes
- [ ] Health check endpoint returns 200 OK
- [ ] User context test endpoint returns correct userId
- [ ] Raindrop connectivity test confirms MCP operations work
- [ ] Error handler middleware catches and formats errors correctly
- [ ] All validation commands pass (lint, typecheck, integration tests)
- [ ] Real-service evidence captured for all MCP operations
- [ ] User isolation verified (users cannot access each other's data)
