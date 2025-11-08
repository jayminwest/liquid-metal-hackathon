# Feature Plan: Integrate Real Raindrop MCP Tools in RaindropClient

## Overview
Replace stub/mock implementations in the `RaindropClient` class with real MCP tool integrations to enable full data persistence and retrieval functionality across the shared API layer. This is purely an integration task with no architectural changes needed - all endpoints and services are structurally ready and waiting for functional MCP calls.

## Issue Relationships
- **Related To**: #1 (api/shared layer implementation) - This issue builds upon the completed API structure
- **Blocks**: #4 (api/tooling layer) - The tooling layer depends on functional MCP integration for tool storage and retrieval

## Technical Approach

The integration will follow Claude Code MCP tool calling patterns. Since this code runs within Claude Code context, all MCP tools are available as direct function calls. Each stub method in `RaindropClient` will be replaced with the corresponding MCP tool call using proper parameter mapping and error handling.

### Architecture Changes
None - the existing `RaindropClient` architecture is production-ready. We're only replacing placeholder console.log statements with actual MCP tool invocations.

### Integration Points
- `api/shared/raindrop.ts` - Core client implementation (lines 22-400)
- All services automatically benefit once RaindropClient methods are functional:
  - `AnnotationService` - Uses annotations for tool metadata
  - `SmartBucketService` - Uses SmartBucket for knowledge search
  - `SmartMemoryService` - Uses working memory for sessions
  - `MCPStorageService` - Uses bucket operations for MCP server code
  - `MCPRegistryService` - Uses annotations for tool registry

### Data Model
No schema changes required. All data structures are already defined in `api/shared/types.ts` and match MCP tool expectations.

## Relevant Files

### Files to Modify
- `api/shared/raindrop.ts` - Replace all stub methods with MCP tool calls (lines 36-399)

### New Files
None - this is purely replacing stub implementations in existing files.

## Task Breakdown

1. **Replace Bucket Operations** (Effort: small)
   - Description: Implement real bucket storage using MCP tools
   - Files: `api/shared/raindrop.ts` (lines 36-96)
   - Validation: Bucket put/get/delete/list operations persist data
   - Dependencies: None

2. **Replace SmartBucket Search Operations** (Effort: small)
   - Description: Implement semantic search using MCP SmartBucket tools
   - Files: `api/shared/raindrop.ts` (lines 98-143)
   - Validation: Document search returns real results from indexed content
   - Dependencies: Task 1 (createSmartBucket needs bucket operations)

3. **Replace Annotation Operations** (Effort: small)
   - Description: Implement metadata storage using MCP annotation tools
   - Files: `api/shared/raindrop.ts` (lines 145-182)
   - Validation: Annotations persist and can be retrieved/listed
   - Dependencies: None

4. **Replace Working Memory Operations** (Effort: small)
   - Description: Implement session memory using MCP SmartMemory tools
   - Files: `api/shared/raindrop.ts` (lines 184-251)
   - Validation: Memory entries persist within sessions and can be searched
   - Dependencies: None

5. **Replace Session Management** (Effort: small)
   - Description: Implement session lifecycle using MCP session tools
   - Files: `api/shared/raindrop.ts` (lines 393-399)
   - Validation: Sessions can be started and ended with proper IDs
   - Dependencies: None

6. **Replace Episodic/Semantic/Procedural Memory** (Effort: small)
   - Description: Implement higher-level memory using MCP tools
   - Files: `api/shared/raindrop.ts` (lines 253-360)
   - Validation: Knowledge documents can be stored and searched
   - Dependencies: Task 4 (uses annotations and bucket operations)

7. **Replace SmartSQL Operations** (Effort: small)
   - Description: Implement SQL operations using MCP SmartSQL tools
   - Files: `api/shared/raindrop.ts` (lines 362-387)
   - Validation: SQL queries execute and return results
   - Dependencies: None

8. **Update Integration Tests** (Effort: medium)
   - Description: Verify all services work end-to-end with real MCP calls
   - Files: `api/shared/test-integration.ts`
   - Validation: All test scenarios pass with real data persistence
   - Dependencies: Tasks 1-7 (all MCP integrations complete)

## Step by Step Tasks

Ordered implementation sequence:
1. Replace bucket operations (put, get, delete, list)
2. Replace SmartBucket search operations (documentSearch, chunkSearch, documentQuery)
3. Replace annotation operations (put, get, list)
4. Replace session management (startSession, endSession)
5. Replace working memory operations (put, get, search, summarize, delete)
6. Replace episodic/semantic/procedural memory operations
7. Replace SmartSQL operations (executeQuery, getMetadata)
8. Update and run integration tests to verify end-to-end functionality

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| MCP tool parameter mismatch | Medium | Follow MCP documentation exactly, use TypeScript for type safety |
| Error handling inconsistencies | Medium | Wrap all MCP calls in try/catch, return consistent error format |
| Session lifecycle issues | High | Properly manage session IDs, ensure cleanup on errors |
| Data format mismatches | Low | Services already use correct data structures matching MCP expectations |

## Validation Strategy

### Validation Level: 2 (Integration)

**Justification**: This feature requires testing real MCP tool interactions with the actual Raindrop backend. Integration tests must verify data persistence, retrieval, and search functionality across all services.

### Validation Commands
```bash
bun run lint
bun run typecheck
bun run test
# Run integration test suite
bun run api/shared/test-integration.ts
```

### Real-Service Evidence (Level 2)
Integration test output showing:
- Successful MCP tool calls with response data
- Data persistence verification (POST → GET returns same data)
- Search functionality returning real results
- Session lifecycle working correctly (start → put memory → get memory → end)
- Error handling for invalid operations

Example expected evidence:
```
Test 1: Annotation Service
  - Storing tool metadata... ✓ Tool metadata stored
  - Retrieving tool metadata... ✓ Tool metadata retrieved: { name: "Slack Reader", ... }
  - Listing user tools... ✓ Found 1 tools

Test 2: SmartBucket Service
  - Initializing user bucket... ✓ Bucket initialized
  - Searching knowledge... ✓ Search executed, results: [...]

Test 3: SmartMemory Service
  - Starting session... ✓ Session started: session_xxxxx
  - Storing memory... ✓ Memory stored
  - Retrieving memory... ✓ Memories retrieved: [{ content: "Test memory content", ... }]

Test 4: MCP Storage Service
  - Storing MCP server code... ✓ Server code stored
  - Retrieving MCP server code... ✓ Server code retrieved (length: 47 bytes)
  - Checking if user has server... ✓ Has server: true

Test 5: MCP Registry Service
  - Registering tool... ✓ Tool registered
  - Listing tools... ✓ Found 1 tools
  - Getting server metadata... ✓ Server metadata: { toolCount: 1, ... }
```

## Success Criteria
- [ ] All stub methods in `RaindropClient` replaced with real MCP tool calls
- [ ] Bucket operations (put, get, delete, list) persist and retrieve data correctly
- [ ] Annotation operations store and retrieve metadata properly
- [ ] Working memory sessions maintain state across put/get operations
- [ ] SmartBucket semantic search returns relevant results from indexed content
- [ ] Session lifecycle works correctly (start → operations → end)
- [ ] All existing services (AnnotationService, SmartBucketService, etc.) work without modification
- [ ] Integration test suite passes with real MCP backend
- [ ] Error handling returns consistent error format across all operations
- [ ] Real-service evidence captured from integration tests
- [ ] All validation commands pass (lint, typecheck, test)
