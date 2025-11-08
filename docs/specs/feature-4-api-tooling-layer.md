# Feature Plan: API Tooling Layer with Agent-Driven MCP Tool Generation

## Overview
Implement the `api/tooling/` layer that enables dynamic MCP tool generation using Claude Code SDK agents with Raindrop orchestration. This layer allows users to request custom tools in natural language (e.g., "I want to read my Slack channels"), and an AI agent autonomously generates the MCP server code, handles OAuth setup, and makes the tool available for execution.

## Issue Relationships
- **Depends On**: #1 (api/shared layer implementation) - Status: CLOSED ✅ (Required MCPRegistry, MCPStorage, AgentOrchestrationService, and other shared services)
- **Related To**: N/A (first tooling implementation)
- **Blocks**: N/A (enables future tool-specific features)

## Technical Approach

The implementation uses an **agent-driven approach** rather than static templates. A Claude Code SDK agent analyzes user requests, generates MCP-compliant tool code, sets up authentication flows, and merges tools into the user's personal MCP server stored in Raindrop.

### Architecture Changes

**New Directory Structure:**
```
api/tooling/
├── index.ts                          # Main Hono router - API endpoints
├── agent/                            # Claude Code SDK agent components
│   ├── toolBuilderAgent.ts          # Core agent that builds MCP tools
│   ├── orchestrationClient.ts       # Client wrapper for Raindrop orchestration
│   └── agentPrompts.ts               # System prompts and guidelines for agent
├── templates/                        # Reference templates for agent guidance
│   ├── base.template.ts              # Base MCP server structure
│   ├── slack.template.ts             # Slack integration reference
│   └── github.template.ts            # GitHub integration reference (optional)
├── builder/                          # Tool building coordination
│   ├── mcpBuilder.ts                 # Coordinates agent-based tool building
│   └── toolMerger.ts                 # Merges new tools into existing MCP server
├── oauth/                            # OAuth flow handlers
│   ├── oauthManager.ts               # Generic OAuth management
│   ├── slackOAuth.ts                 # Slack-specific OAuth flow
│   └── providers.ts                  # OAuth provider configurations
└── executor/                         # Tool execution
    └── mcpRunner.ts                  # Loads and executes user MCP servers
```

### Integration Points

**Dependencies on api/shared:**
- `MCPRegistry` - Tool discovery and metadata retrieval
- `MCPStorage` - Store/retrieve MCP server code from Raindrop
- `AgentOrchestrationService` - Wrapper for Raindrop orchestration MCP tools (NEW - needs to be added to api/shared)
- `RaindropService` - Low-level Raindrop MCP wrappers
- `userContextMiddleware` - Extract userId from requests
- Utility functions (`getUserKey`, `validateToolId`, `successResponse`, `errorResponse`)

**Integration with Raindrop MCP Server:**
The agent has access to:
- `mcp__raindrop-mcp__get-prompt` - Orchestration workflow prompts
- `mcp__raindrop-mcp__update-state` - State transitions
- `mcp__raindrop-mcp__put-object` - Store generated code
- `mcp__raindrop-mcp__get-object` - Retrieve existing server
- `mcp__raindrop-mcp__put-annotation` - Store metadata
- `mcp__raindrop-mcp__fetch_documentation_page` - Learn MCP specs

### Data Model

**Per-User MCP Server Structure (Raindrop Bucket: "user-mcp-servers"):**
```
users/{userId}/mcp-server/
├── server.ts                 # Complete MCP server code with all tools
├── credentials.json          # OAuth tokens & API keys (plaintext for hackathon)
└── metadata.json             # Server info (tool list, versions, etc.)
```

**Tool Metadata (Raindrop Annotations):**
```typescript
interface ToolMetadata {
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
```

**MCP Server Metadata (Raindrop Annotations):**
```typescript
interface MCPServerMetadata {
  userId: string;
  status: 'active' | 'inactive' | 'error';
  toolCount: number;
  lastUpdated: string;
  mcpServerPath: string;
  version: string;
}
```

## Relevant Files

### Files to Modify
- `api/shared/services/agentOrchestration.ts` - **NEW FILE NEEDED** - Create service wrapper for Raindrop orchestration MCP tools
- `api/shared/index.ts` - Export AgentOrchestrationService for use by tooling layer

### New Files

**Phase 1: Foundation (4-6 hours)**
- `api/tooling/index.ts` - API routes with all endpoints (create, list, execute, delete, oauth callback)
- `api/tooling/templates/base.template.ts` - Base MCP server structure template
- `api/tooling/builder/toolMerger.ts` - Logic to merge new tools into existing MCP servers
- `api/tooling/executor/mcpRunner.ts` - Load and execute user MCP servers dynamically

**Phase 2: Agent Infrastructure (6-8 hours)**
- `api/tooling/agent/agentPrompts.ts` - System prompts, guidelines, and examples for agent
- `api/tooling/agent/orchestrationClient.ts` - Wrapper for Raindrop orchestration MCP tools
- `api/tooling/agent/toolBuilderAgent.ts` - Core agent that generates MCP tool code
- `api/tooling/builder/mcpBuilder.ts` - Orchestrate agent execution and coordinate tool creation

**Phase 3: OAuth & Templates (3-4 hours)**
- `api/tooling/oauth/oauthManager.ts` - Generic OAuth flow handling
- `api/tooling/oauth/slackOAuth.ts` - Slack-specific OAuth provider implementation
- `api/tooling/oauth/providers.ts` - OAuth provider configurations
- `api/tooling/templates/slack.template.ts` - Slack integration reference for agent

**Phase 4: Testing & Polish (2-3 hours)**
- End-to-end tests
- Error handling improvements
- Documentation updates

## Task Breakdown

1. **Create AgentOrchestrationService in api/shared** (Effort: small)
   - Description: Add missing service wrapper for Raindrop orchestration MCP tools
   - Files: `api/shared/services/agentOrchestration.ts`, `api/shared/index.ts`
   - Validation: Service can start sessions and interact with orchestration workflow
   - Dependencies: None

2. **Build Foundation Layer** (Effort: medium)
   - Description: Implement core API routes, base template, tool merger, and executor
   - Files: `index.ts`, `templates/base.template.ts`, `builder/toolMerger.ts`, `executor/mcpRunner.ts`
   - Validation: API endpoints respond, tools can be merged into server structure, server code can be loaded/executed
   - Dependencies: Task 1 (AgentOrchestrationService)

3. **Implement Agent Infrastructure** (Effort: large)
   - Description: Build agent prompts, orchestration client, tool builder agent, and MCP builder coordinator
   - Files: `agent/agentPrompts.ts`, `agent/orchestrationClient.ts`, `agent/toolBuilderAgent.ts`, `builder/mcpBuilder.ts`
   - Validation: Agent can analyze requests, generate tool code, interact with Raindrop orchestration
   - Dependencies: Task 2 (Foundation layer)

4. **Add OAuth & Templates** (Effort: medium)
   - Description: Implement OAuth flow handling, Slack provider, and reference templates
   - Files: `oauth/oauthManager.ts`, `oauth/slackOAuth.ts`, `oauth/providers.ts`, `templates/slack.template.ts`
   - Validation: OAuth flow completes successfully, credentials stored in Raindrop
   - Dependencies: Task 2 (Foundation layer)

5. **End-to-End Testing** (Effort: small)
   - Description: Test complete flow from user request to tool execution
   - Files: Test scripts/manual validation
   - Validation: User can request Slack tool, complete OAuth, and execute tool
   - Dependencies: Tasks 3 and 4 (Agent + OAuth)

6. **Error Handling & Polish** (Effort: small)
   - Description: Add comprehensive error handling, improve error messages, update docs
   - Files: All files (error handling), `docs/API_TOOLING_STRUCTURE.md`
   - Validation: Errors are caught gracefully, user gets helpful messages
   - Dependencies: Task 5 (Testing reveals issues)

## Step by Step Tasks

Ordered implementation sequence:
1. Create `api/shared/services/agentOrchestration.ts` with wrappers for Raindrop orchestration MCP tools
2. Export AgentOrchestrationService from `api/shared/index.ts`
3. Create `api/tooling/templates/base.template.ts` with base MCP server structure
4. Implement `api/tooling/builder/toolMerger.ts` to merge tools into servers
5. Implement `api/tooling/executor/mcpRunner.ts` to dynamically load/execute user MCP servers
6. Create `api/tooling/index.ts` with API route stubs (create, list, execute, delete, oauth callback)
7. Implement `api/tooling/agent/agentPrompts.ts` with system prompts and examples
8. Implement `api/tooling/agent/orchestrationClient.ts` as clean wrapper for orchestration
9. Implement `api/tooling/agent/toolBuilderAgent.ts` to spawn agent and generate tool code
10. Implement `api/tooling/builder/mcpBuilder.ts` to coordinate agent execution
11. Wire up `POST /api/tools/create` endpoint to use mcpBuilder
12. Implement `api/tooling/oauth/providers.ts` with OAuth provider configs
13. Implement `api/tooling/oauth/slackOAuth.ts` for Slack-specific OAuth
14. Implement `api/tooling/oauth/oauthManager.ts` for generic OAuth handling
15. Wire up `GET /api/tools/oauth/callback` endpoint
16. Create `api/tooling/templates/slack.template.ts` as reference for agent
17. Implement remaining endpoints (list, get, execute, delete)
18. End-to-end test: Request Slack tool → Agent builds → OAuth → Execute
19. Add error handling for agent failures, OAuth errors, execution issues
20. Update `docs/API_TOOLING_STRUCTURE.md` with implementation notes

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Agent generates invalid MCP code | High | Add code validation step before storing; agent has access to MCP docs |
| OAuth flow fails or credentials not stored | High | Test OAuth with mock credentials first; add retry logic |
| Dynamic code execution security issues | Medium | For hackathon: trust agent output; Future: sandbox execution |
| Agent workflow gets stuck or fails | Medium | Add timeout and fallback to simpler template-based generation |
| Raindrop orchestration MCP tools not available | High | Verify tools are accessible before starting; add error messages |
| Multiple tools conflict in single MCP server | Medium | Tool merger validates unique tool IDs; agent checks existing tools |

## Validation Strategy

### Validation Level: 2 (Integration)

**Justification**: This is a new feature with API changes, agent infrastructure, and OAuth flows. Integration tests are necessary to verify the complete workflow including real Raindrop MCP server interactions.

### Validation Commands
```bash
# Lint and typecheck
bun run lint
bun run typecheck

# Integration tests
bun test --filter integration

# Manual end-to-end test (documented below)
curl -X POST http://localhost:3000/api/tools/create \
  -H "X-User-ID: user123" \
  -H "Content-Type: application/json" \
  -d '{"request": "I want to read my Slack channels", "context": "team monitoring"}'
```

### Real-Service Evidence (Level 2)

**Evidence to capture:**
- Raindrop orchestration MCP logs showing:
  - `get-prompt` calls with workflow state
  - `update-state` calls with tool generation artifacts
  - `put-object` calls storing generated MCP server code
  - `put-annotation` calls storing tool metadata
- OAuth flow completion logs:
  - Authorization URL generation
  - Code exchange for tokens
  - Credential storage in Raindrop
- Tool execution logs:
  - MCP server loading from Raindrop
  - Tool function execution
  - Slack API call (or mock response)

**Example evidence format:**
```
[Orchestration] start-session → session_id=abc123, timeline_id=xyz789
[Orchestration] get-prompt → state="tool_analysis", prompt="Analyze user request..."
[Agent] Generated tool code: slack-reader.ts (1247 bytes)
[Orchestration] update-state → artifacts={toolId: "slack-reader", ...}, status="complete"
[Storage] put-object → bucket=user-mcp-servers, key=users/user123/mcp-server/server.ts
[Annotation] put-annotation → users/user123/tools/slack-reader → {status: "pending_oauth"}
[OAuth] Generated auth URL → https://slack.com/oauth/v2/authorize?...
[OAuth] Token exchange successful → accessToken stored
[Annotation] update-annotation → users/user123/tools/slack-reader → {status: "active"}
[Executor] Loaded MCP server for user123
[Executor] Executing tool: slack-reader.readChannel({channel: "#general"})
[Slack API] GET https://slack.com/api/conversations.history?channel=C123 → 200 OK
```

## Success Criteria
- [ ] Agent successfully builds Slack tool from natural language request ("I want to read my Slack channels")
- [ ] Agent generates MCP-compliant code without manual intervention
- [ ] Agent sets up OAuth configuration autonomously
- [ ] OAuth flow completes and stores credentials in Raindrop
- [ ] Tool executes successfully and returns Slack API data (or mock data)
- [ ] Multiple tools can coexist in one user's MCP server without conflicts
- [ ] Tool metadata is tracked correctly in Raindrop Annotations
- [ ] All validation commands pass (lint, typecheck, integration tests)
- [ ] Real-service evidence captured for orchestration, storage, and OAuth flows
- [ ] Error handling works gracefully (agent failures, OAuth errors, execution issues)

## Additional Notes

**Estimated Total Time:** 15-21 hours (Day 2 focus after api/shared/ complete)

**Key Architecture Decisions:**
- **Agent-driven generation** chosen over static templates for flexibility and autonomy
- **Raindrop orchestration** provides workflow management and state tracking
- **Per-user MCP servers** - each user has ONE server containing all their tools
- **OAuth credentials stored as plaintext** in Raindrop for hackathon speed (encrypt in production)

**Security Considerations:**
- For hackathon: Trust agent-generated code (no sandbox)
- For production: Add code validation, sandboxed execution, credential encryption

**Future Enhancements:**
- GitHub integration support
- Email tool support
- Tool update/refresh capability
- Better error messages from agent
- Agent can handle edge cases autonomously
- Encrypted credential storage
- Code execution sandboxing

## Manual Testing Checklist

After implementation, verify the following manually:

### 1. Tool Creation (Agent-Based)
```bash
# Request Slack tool creation
curl -X POST http://localhost:3000/api/tools/create \
  -H "X-User-ID: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "request": "I want to read my Slack channels",
    "context": "team monitoring"
  }'

# Expected response:
# {
#   "success": true,
#   "toolId": "slack-reader",
#   "status": "pending_oauth",
#   "oauthUrl": "https://slack.com/oauth/v2/authorize?...",
#   "agentGenerated": true
# }
```

### 2. List Tools
```bash
curl http://localhost:3000/api/tools \
  -H "X-User-ID: user123"

# Expected response:
# {
#   "success": true,
#   "data": [
#     {
#       "toolId": "slack-reader",
#       "status": "pending_oauth",
#       "template": "slack",
#       "createdAt": "..."
#     }
#   ]
# }
```

### 3. Complete OAuth
```bash
# Manual step: Click oauthUrl from step 1, authorize in browser
# Redirected to: http://localhost:3000/api/tools/oauth/callback?code=xxx&state=user123:slack-reader

# Expected: HTML page showing "OAuth complete! Your tool is ready."
```

### 4. Verify Tool is Active
```bash
curl http://localhost:3000/api/tools/slack-reader \
  -H "X-User-ID: user123"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "toolId": "slack-reader",
#     "status": "active",
#     "oauthComplete": true,
#     "displayName": "Slack Channel Reader"
#   }
# }
```

### 5. Execute Tool
```bash
curl -X POST http://localhost:3000/api/tools/slack-reader/execute \
  -H "X-User-ID: user123" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "readChannel",
    "params": { "channel": "#general" }
  }'

# Expected response:
# {
#   "success": true,
#   "data": [
#     { "user": "alice", "message": "Hello team!", "timestamp": "..." },
#     { "user": "bob", "message": "Meeting at 3pm", "timestamp": "..." }
#   ]
# }
```

### 6. Delete Tool
```bash
curl -X DELETE http://localhost:3000/api/tools/slack-reader \
  -H "X-User-ID: user123"

# Expected response:
# {
#   "success": true,
#   "deleted": "slack-reader"
# }
```
