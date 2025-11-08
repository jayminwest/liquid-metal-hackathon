# Feature Plan: Replace In-Memory Storage with Raindrop MCP Integration

## Overview

The local MCP server (`api/shared/mcp-server.ts`) currently uses in-memory JavaScript Maps for all data storage, which means data is lost on server restart. This plan outlines replacing the in-memory storage with actual Raindrop MCP tool calls to enable true persistence and transform the local server from a standalone service into a thin HTTP transport proxy over Raindrop.

## Issue Relationships

- **Depends On**: #6 (RaindropClient integration) - Status: closed ✅
  - RaindropClient is already implemented with real MCP tool calls (api/shared/raindrop.ts)
  - All validation, error handling, and type safety already in place
  - Can directly reuse the existing RaindropClient wrapper
- **Related To**: #1 (api/shared layer implementation) - Status: closed ✅
  - Part of the shared API infrastructure
  - Shares validation and error handling patterns
- **Blocks**: None identified
  - The local MCP server is configured in .mcp.json but is independent of other features
  - After completion, the HTTP transport wrapper provides value for clients that don't support stdio transport

## Technical Approach

### Strategy: Import and Use RaindropClient

Since issue #6 is complete, we can directly import and use the existing `RaindropClient` class from `api/shared/raindrop.ts`. This approach:
- Reuses all existing validation, error handling, and type safety
- Maintains consistent error messages and logging
- Avoids duplicating MCP tool call logic
- Follows the established pattern from the api/shared layer

### Architecture Changes

**Before:**
```typescript
const storage = {
  buckets: new Map<string, Map<string, string>>(),
  annotations: new Map<string, any>(),
  sessions: new Map<string, any[]>(),
  smartBuckets: new Set<string>(),
};
```

**After:**
```typescript
import { RaindropClient } from './raindrop.js';

const raindropClient = new RaindropClient({
  endpoint: process.env.RAINDROP_ENDPOINT || 'http://localhost:3000',
  auth: {
    type: 'bearer',
    token: process.env.RAINDROP_TOKEN || '',
  },
});
```

### Integration Points

**File:** `api/shared/mcp-server.ts`

**Lines to modify:**
- Lines 14-20: Remove in-memory storage Maps
- Lines 199-509: Replace all tool handlers with RaindropClient method calls

**Import statement to add:**
```typescript
import { RaindropClient } from './raindrop.js';
```

### Data Model

No new types or interfaces needed. The RaindropClient already handles all MCP tool schemas and validation. The MCP server will simply:
1. Receive tool calls via HTTP transport
2. Parse and validate the request
3. Delegate to RaindropClient methods
4. Return the response via HTTP transport

## Relevant Files

### Files to Modify

- `api/shared/mcp-server.ts` - Replace in-memory storage with RaindropClient calls
  - Line 14-20: Remove storage Maps
  - Line 199-509: Update all 13 tool handlers
  - Add import for RaindropClient
  - Add RaindropClient instantiation

### New Files

None - all required infrastructure exists in api/shared/raindrop.ts

## Task Breakdown

1. **Import RaindropClient and remove in-memory storage** (Effort: small)
   - Description: Add import statement and instantiate RaindropClient, remove storage Maps
   - Files: api/shared/mcp-server.ts (lines 1-20)
   - Validation: TypeScript compile succeeds, no references to storage Maps remain
   - Dependencies: None

2. **Replace bucket operation handlers** (Effort: small)
   - Description: Update put-object, get-object, delete-object, list-objects handlers
   - Files: api/shared/mcp-server.ts (lines 204-303)
   - Validation: Each handler calls corresponding RaindropClient method
   - Dependencies: Task 1

3. **Replace SmartBucket handlers** (Effort: small)
   - Description: Update create-smartbucket and document-search handlers
   - Files: api/shared/mcp-server.ts (lines 305-366)
   - Validation: create-smartbucket uses real MCP tool, document-search uses semantic search
   - Dependencies: Task 1

4. **Replace annotation handlers** (Effort: small)
   - Description: Update put-annotation, get-annotation, list-annotations handlers
   - Files: api/shared/mcp-server.ts (lines 368-431)
   - Validation: All annotation operations persist via Raindrop
   - Dependencies: Task 1

5. **Replace memory session handlers** (Effort: small)
   - Description: Update start-session, put-memory, get-memory handlers
   - Files: api/shared/mcp-server.ts (lines 433-509)
   - Validation: Sessions and memories persist across server restarts
   - Dependencies: Task 1

6. **Add comprehensive error handling** (Effort: small)
   - Description: Ensure all Raindrop call failures are caught and returned with proper MCP error format
   - Files: api/shared/mcp-server.ts (all handlers)
   - Validation: Test failure scenarios, verify error responses match MCP spec
   - Dependencies: Tasks 2-5

7. **Create persistence validation test** (Effort: medium)
   - Description: Write integration test that validates data persists across server restarts
   - Files: api/shared/test-mcp-persistence.ts (new file)
   - Validation: Test creates data, restarts server, verifies data still exists
   - Dependencies: Tasks 2-5

8. **Update documentation** (Effort: small)
   - Description: Update .mcp.json description and add comments clarifying server is a Raindrop proxy
   - Files: .mcp.json, api/shared/mcp-server.ts
   - Validation: Documentation accurately describes server's role as HTTP transport proxy
   - Dependencies: None

## Step by Step Tasks

Ordered implementation sequence:

1. Import RaindropClient at top of mcp-server.ts
2. Instantiate RaindropClient with config (after createMCPServer function)
3. Remove storage Maps (lines 14-20)
4. Update put-object handler to call raindropClient.putObject()
5. Update get-object handler to call raindropClient.getObject()
6. Update delete-object handler to call raindropClient.deleteObject()
7. Update list-objects handler to call raindropClient.listObjects()
8. Update create-smartbucket handler to call raindropClient.createSmartBucket()
9. Update document-search handler to call raindropClient.documentSearch()
10. Update put-annotation handler to call raindropClient.putAnnotation()
11. Update get-annotation handler to call raindropClient.getAnnotation()
12. Update list-annotations handler to call raindropClient.listAnnotations()
13. Update start-session handler to call raindropClient.startSession()
14. Update put-memory handler to call raindropClient.putMemory()
15. Update get-memory handler to call raindropClient.getMemory()
16. Add error handling to all handlers (wrap in try/catch, use sanitizeError)
17. Test typecheck and lint
18. Create persistence test file
19. Run integration test
20. Update .mcp.json description
21. Add code comments explaining proxy architecture

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking existing clients using the local MCP server | Medium | Test all tool operations before/after to ensure API compatibility |
| RaindropClient runtime dependency on Claude Code | High | Add runtime check for MCP tools availability (already exists in raindrop.ts) |
| Performance degradation from network calls | Low | HTTP transport already implies network overhead; Raindrop MCP is designed for this |
| Error handling differences between in-memory and MCP | Medium | Reuse RaindropClient's sanitizeError for consistent error messages |

## Validation Strategy

### Validation Level: 2

**Justification**: This feature modifies core data persistence infrastructure and requires testing with real Raindrop MCP integration. Level 2 (Integration) is appropriate because:
- Changes affect all MCP tool handlers (13 tools total)
- Must verify data persists across server restarts
- Requires real-service evidence from Raindrop MCP
- No database schema or auth changes (Level 3 not needed)

### Validation Commands

```bash
# Level 1: Type safety and linting
bun run typecheck
bun run lint

# Level 2: Integration tests
bun test --filter integration

# Feature-specific validation: Persistence test
bun run api/shared/test-mcp-persistence.ts

# Manual validation: Server restart test
# 1. Start MCP server: bun run api/shared/mcp-server.ts
# 2. Call put-object via HTTP transport
# 3. Restart server
# 4. Call get-object via HTTP transport
# 5. Verify object still exists
```

### Real-Service Evidence (Level 2)

Capture evidence of actual Raindrop MCP integration:

**Required Evidence:**
1. **Bucket persistence**: Create object, restart server, retrieve object successfully
2. **SmartBucket search**: Create SmartBucket, upload document, verify semantic search works (not keyword search)
3. **Annotation persistence**: Store annotation, restart server, retrieve annotation successfully
4. **Memory session**: Start session, store memory, verify memory persists with session_id
5. **Error handling**: Trigger Raindrop MCP error (e.g., invalid bucket name), verify error is sanitized and returned correctly

**Evidence Format:**
```
MCP Server Integration Test Results:
- put-object → Raindrop MCP: bucket=test-bucket key=test.txt ✓
- Server restart: ✓
- get-object → Raindrop MCP: retrieved content (42 bytes) ✓
- document-search → Raindrop MCP: query="test" results=3 (semantic, not keyword) ✓
- Error handling: Invalid bucket name → "Bucket name must be alphanumeric" ✓
```

## Success Criteria

- [ ] All in-memory storage Maps removed from mcp-server.ts
- [ ] All 13 tool handlers use RaindropClient methods
- [ ] RaindropClient import and instantiation added
- [ ] TypeScript compilation succeeds with no errors
- [ ] Lint passes with no warnings
- [ ] Integration tests pass
- [ ] Persistence test validates data survives server restart
- [ ] SmartBucket document-search uses real semantic search (not keyword matching)
- [ ] Error messages are sanitized and consistent with RaindropClient patterns
- [ ] .mcp.json description updated to reflect server's role as Raindrop proxy
- [ ] Code comments added explaining architecture
- [ ] All validation commands pass
- [ ] Real-service evidence captured showing Raindrop MCP integration

## Additional Notes

### Why This Matters

Transforming the local MCP server into a Raindrop proxy provides:
1. **True persistence**: Data survives server restarts and is backed by Raindrop infrastructure
2. **Semantic search**: SmartBucket searches use real vector embeddings, not keyword matching
3. **Multi-client access**: Data stored via this server is accessible from any Raindrop MCP client
4. **HTTP transport value**: Clients that don't support stdio transport can still use Raindrop via HTTP

### Post-Implementation Considerations

After this feature is complete, consider:
- **Server necessity**: Evaluate if the HTTP transport wrapper is still needed, or if clients should call Raindrop MCP tools directly
- **Caching layer**: If HTTP transport overhead becomes a concern, consider adding a cache layer (but only if measured performance indicates need)
- **Multi-user support**: Current implementation shares a single RaindropClient instance; for multi-user scenarios, consider per-user isolation

### Reference Implementation

The RaindropClient (api/shared/raindrop.ts) already demonstrates the correct patterns:
- Lines 78-96: createSmartBucket with validation and error handling
- Lines 98-123: putObject with validateBucketName, validateObjectKey, validateContentLength
- Lines 189-209: documentSearch for semantic search

Follow these patterns when updating tool handlers in mcp-server.ts.
