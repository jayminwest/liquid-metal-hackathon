# API Layer Documentation

Documentation for the backend/API layer of the raindrop-hackathon project.

## Architecture Overview

The API layer consists of three main components:

```
api/
├── knowledge/      # Local-first knowledge storage with Raindrop sync
├── tooling/        # Dynamic MCP server builder
└── shared/         # Common CRUD operations and utilities
```

## Layer 1: api/knowledge/

**Purpose**: Local-first knowledge storage using basic-memory with bidirectional Raindrop sync.

### Responsibilities
- Store user knowledge locally (fast access)
- Sync knowledge to/from Raindrop (persistence + cloud backup)
- Per-user knowledge isolation
- Semantic search over knowledge base
- Knowledge CRUD operations

### Key Components

#### Local Storage (basic-memory)
- File-based storage in `data/` directory
- Fast read/write without network calls
- Immediate availability for agent queries

#### Sync Service
- **Bidirectional**: local ↔ Raindrop
- **Per-user**: Isolated storage per user
- **Background**: Transparent sync operations
- **Queue**: Pending operations for offline scenarios

### API Endpoints (Planned)

```
POST   /api/knowledge         # Add to knowledge base
GET    /api/knowledge/search  # Search knowledge (semantic)
PUT    /api/knowledge/:id     # Update knowledge entry
DELETE /api/knowledge/:id     # Delete knowledge entry
GET    /api/sync/status       # Check sync status
POST   /api/sync/trigger      # Force sync
```

### Integration with Raindrop

Uses Raindrop MCP server for:
- Working memory operations (`put-memory`, `get-memory`)
- SmartBucket storage (for structured knowledge)
- Annotation storage (for metadata)

**MCP Tools Used:**
- `mcp__raindrop-mcp__put-memory` - Store knowledge
- `mcp__raindrop-mcp__get-memory` - Retrieve knowledge
- `mcp__raindrop-mcp__search-memory` - Semantic search
- `mcp__raindrop-mcp__create-smartbucket` - Per-user buckets

### Testing Approach

**Philosophy**: Real service integration (anti-mock)

- Use actual Raindrop MCP server in tests
- Capture real API logs as evidence
- Test both local and sync operations
- Verify data integrity across sync

**Example Test Structure:**
```typescript
describe('Knowledge Sync Service', () => {
  it('syncs knowledge to Raindrop', async () => {
    // Add knowledge locally
    const entry = await knowledge.add(userId, content);

    // Trigger sync
    await sync.syncToRaindrop(userId);

    // Verify in Raindrop (real MCP call)
    const retrieved = await raindrop.getMemory(userId);
    expect(retrieved).toContain(entry);
  });
});
```

---

## Layer 2: api/tooling/

**Purpose**: Dynamically create MCP servers based on user requests.

### Responsibilities
- Parse user tool requests (natural language)
- Generate MCP server code for requested integration
- Handle OAuth/API key flows for external services
- Register tools per-user
- Execute tools on behalf of users

### Key Components

#### MCP Builder
- **Input**: User request ("I want to read my Slack channels")
- **Output**: Functional MCP server with authentication
- **Uses**: Raindrop MCP server + Claude Code SDK

#### Authentication Manager
- OAuth flow handling (redirect, token exchange)
- API key storage (encrypted, per-user)
- Token refresh logic
- Security: Never expose credentials

#### Tool Registry
- Per-user tool listing
- Tool versioning
- Tool metadata (name, description, capabilities)

### API Endpoints (Planned)

```
POST   /api/tools/create      # Request tool creation
GET    /api/tools             # List user's tools
GET    /api/tools/:id         # Get tool details
POST   /api/tools/:id/execute # Execute a tool
DELETE /api/tools/:id         # Remove tool
POST   /api/tools/:id/auth    # Complete OAuth flow
```

### Dynamic Tool Creation Flow

1. **User Request**
   - User: "I want to read my Slack channels"
   - Agent parses intent: Slack integration, read scope

2. **Generate MCP Server**
   - Use Claude Code SDK to generate MCP server template
   - Include Slack API integration
   - Add OAuth configuration

3. **Authentication**
   - Provide OAuth link to user
   - User completes OAuth
   - Store tokens securely (encrypted, per-user)

4. **Tool Activation**
   - Register tool in user's registry
   - Make available for execution
   - Agent can now call tool

### Integration with Raindrop

Uses Raindrop MCP server for:
- Storing tool configurations
- Managing user tool registry
- Persisting OAuth tokens (encrypted)

**Example Storage:**
```json
{
  "userId": "user123",
  "tools": [
    {
      "id": "slack-reader-abc",
      "name": "Slack Channel Reader",
      "type": "slack",
      "scopes": ["channels:read", "channels:history"],
      "authToken": "<encrypted>",
      "createdAt": "2025-11-08T..."
    }
  ]
}
```

### Testing Approach

**Integration Testing:**
- Test tool generation with mock user requests
- Verify OAuth flow (use test credentials)
- Test tool execution with real external APIs
- Capture API call evidence

**Example Test:**
```typescript
describe('Dynamic Tool Creation', () => {
  it('creates Slack tool with OAuth', async () => {
    // Request tool
    const request = { intent: 'read Slack channels', service: 'slack' };
    const tool = await tooling.create(userId, request);

    // Verify MCP server generated
    expect(tool.mcpServer).toBeDefined();
    expect(tool.authFlow).toBe('oauth');

    // Complete OAuth (using test credentials)
    await tooling.completeAuth(userId, tool.id, testOAuthCode);

    // Execute tool
    const result = await tooling.execute(userId, tool.id, { channel: '#general' });
    expect(result.messages).toBeDefined();
  });
});
```

---

## Layer 3: api/shared/

**Purpose**: Common CRUD operations, utilities, and middleware.

### Responsibilities
- Shared Raindrop operations
- Common middleware (auth, logging, error handling)
- Utility functions
- Type definitions
- Configuration management

### Key Components

#### Raindrop Client
- Wrapper around Raindrop MCP tools
- Consistent error handling
- Retry logic
- Rate limiting awareness

#### Utilities
- Data validation helpers
- Encryption/decryption for sensitive data
- Date/time utilities
- String processing

#### Middleware
- Request logging
- Error handling
- Authentication (if multi-user in future)
- CORS configuration

### API Patterns

**Standard Response Format:**
```typescript
{
  "success": boolean,
  "data": T | null,
  "error": string | null,
  "timestamp": string
}
```

**Error Handling:**
```typescript
try {
  // Operation
} catch (error) {
  return {
    success: false,
    data: null,
    error: error.message,
    timestamp: new Date().toISOString()
  };
}
```

---

## Validation Strategies

### Validation Levels

**Level 1 (Quick)**: lint + typecheck
- Use for: Config changes, type definitions
- Commands: `bun run lint`, `bun run typecheck`

**Level 2 (Integration)**: Level 1 + integration tests (DEFAULT)
- Use for: New features, API endpoints, most work
- Commands: `bun run lint`, `bun run typecheck`, `bun test --filter integration`

**Level 3 (Release)**: Level 2 + all tests + build
- Use for: Critical paths, auth changes, schema changes
- Commands: All Level 2 + `bun test`, `bun run build`

### Real-Service Evidence (Level 2+)

Always capture evidence of real service integration:

**Example for Knowledge Sync:**
```
Raindrop MCP integration tests showing:
- put-memory call: [timestamp] session_id=abc123 content_length=247 success
- get-memory retrieval: [timestamp] returned 5 entries
- search-memory semantic query: [timestamp] query="AI agents" results=3
```

---

## File Structure Conventions

```
api/
├── knowledge/
│   ├── index.ts              # Main knowledge service
│   ├── sync.ts               # Sync service
│   ├── storage.ts            # basic-memory wrapper
│   └── __tests__/
│       ├── knowledge.test.ts # Unit tests
│       └── sync.integration.test.ts # Integration tests
│
├── tooling/
│   ├── index.ts              # Main tooling service
│   ├── builder.ts            # MCP builder
│   ├── auth.ts               # Authentication manager
│   ├── registry.ts           # Tool registry
│   └── __tests__/
│       ├── builder.test.ts
│       └── auth.integration.test.ts
│
└── shared/
    ├── index.ts              # Exports
    ├── raindrop-client.ts    # Raindrop wrapper
    ├── middleware.ts         # Express middleware
    ├── utils.ts              # Utilities
    └── types.ts              # Type definitions
```

---

## Testing Patterns

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

describe('Knowledge Service Integration', () => {
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    // Setup: Create test session
    sessionId = await raindrop.startSession();
    userId = 'test-user-123';
  });

  afterAll(async () => {
    // Cleanup: End session
    await raindrop.endSession(sessionId, { flush: false });
  });

  it('adds and retrieves knowledge', async () => {
    // Add knowledge
    const content = 'Test knowledge entry';
    const entry = await knowledge.add(userId, content);

    // Retrieve
    const results = await knowledge.search(userId, 'test knowledge');

    // Verify
    expect(results).toContainEqual(entry);
  });

  it('syncs knowledge to Raindrop', async () => {
    // Add locally
    const content = 'Sync test entry';
    await knowledge.add(userId, content);

    // Sync to Raindrop
    await sync.syncToRaindrop(userId);

    // Verify in Raindrop
    const memories = await raindrop.getMemory(sessionId, { key: userId });
    expect(memories.some(m => m.content === content)).toBe(true);
  });
});
```

---

## API Development Workflow

1. **Plan** → Use `/issues/feature` to create feature plan
2. **Implement** → Use `/workflows/implement` to execute plan
3. **Test** → Run validation (Level 2+ for API features)
4. **Commit** → Use `/git/commit` for proper commit messages
5. **PR** → Use `/git/pull_request` with validation evidence

---

## Common Patterns

### Error Handling

```typescript
export class KnowledgeService {
  async add(userId: string, content: string) {
    try {
      // Validate
      if (!content || content.trim().length === 0) {
        throw new Error('Content cannot be empty');
      }

      // Store locally
      const entry = await this.storage.add(userId, content);

      // Queue for sync
      await this.sync.queueForSync(userId, entry.id);

      return { success: true, data: entry, error: null };
    } catch (error) {
      console.error('Knowledge add failed:', error);
      return { success: false, data: null, error: error.message };
    }
  }
}
```

### Raindrop MCP Usage

```typescript
import { mcp__raindrop_mcp__put_memory } from './shared/raindrop-client';

async function syncToRaindrop(userId: string, content: string) {
  const result = await mcp__raindrop_mcp__put_memory({
    session_id: sessionId,
    content: content,
    key: userId,
    timeline: 'knowledge'
  });

  if (!result.success) {
    throw new Error(`Raindrop sync failed: ${result.error}`);
  }

  return result;
}
```

---

## References

- **PRD.md**: Feature requirements and architecture
- **README.md**: Setup and running the project
- **Raindrop MCP Docs**: Tool documentation and examples
