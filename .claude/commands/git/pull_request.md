# Create Pull Request

Create a GitHub pull request after implementation and validation.

## Preconditions

Before creating a PR, verify:
- ✅ Clean working tree: `git status`
- ✅ Commits follow Conventional Commits format
- ✅ Validation passed (Level 2+ recommended)
- ✅ Real-service evidence captured (for Level 2+)
- ✅ All changes committed and pushed to remote branch

## PR Title Format

### Planning PRs (spec/plan documents)
```
<type>: add [specification|plan] for <feature> (#<issue>)
```

Examples:
- `docs: add specification for knowledge sync (#42)`
- `docs: add plan for dynamic tool creation (#56)`

### Implementation PRs
```
<type>: <imperative verb> <feature> (#<issue>)
```

Examples:
- `feat: add knowledge sync service (#42)`
- `fix: resolve race condition in tool builder (#127)`
- `chore: refactor API error handling (#89)`

## PR Body Requirements

```markdown
## Summary
[1-2 paragraphs: what does this PR do and why?]

## Changes
- [Key change 1]
- [Key change 2]
- [Key change 3]

## Issue Relationships
- Closes #XX
- Related to #YY
- Blocks #ZZ

## Validation Evidence

### Validation Level: [1/2/3]
**Justification**: [Why this level - e.g., "Level 2: new feature with API endpoints"]

**Commands Run**:
- ✅/❌ `bun run lint` - [pass/fail - details if failed]
- ✅/❌ `bun run typecheck` - [pass/fail - details if failed]
- ✅/❌ `bun test --filter integration` - [X/Y tests passed]

### Real-Service Evidence (Level 2+ only)
[Provide evidence of integration with real services]

**Example**: Raindrop MCP integration tests showing:
- put-memory calls: [log snippet]
- get-memory retrievals: [log snippet]
- Working memory session lifecycle: [log snippet]

## Testing
[How was this tested? Any manual testing steps?]

## Screenshots (if UI changes)
[Add screenshots if applicable]

## Notes
[Any additional context, follow-up work, or known limitations]
```

## Execution Flow

### 1. Pre-Flight Checks
```bash
# Ensure clean state
git status

# Verify commits
git log --oneline origin/main..HEAD

# Ensure pushed to remote
git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

### 2. Gather PR Information

Review:
- Commit messages (for PR title and changes list)
- Validation output (for evidence section)
- Issue relationships (for linking)
- Test results (for validation section)

### 3. Determine Validation Level

Based on changes:
- **Level 1**: Config-only, docs-only, README updates
- **Level 2**: New features, API changes, bug fixes (DEFAULT)
- **Level 3**: Schema changes, auth changes, critical paths

### 4. Create PR

```bash
gh pr create \
  --title "<type>: <description> (#<issue>)" \
  --body-file /tmp/pr-body.md \
  --base main
```

### 5. Verify PR Created

```bash
gh pr view
```

Confirm:
- Title is correct
- Body includes all required sections
- Validation evidence is present
- Issue links work

## CRITICAL Output Format

**Return ONLY the PR URL as plain text.**

### ✅ Correct Output
```
https://github.com/user/raindrop-hackathon-11-08-2025/pull/123
```

### ❌ Incorrect Output

Do NOT include:
```
Successfully created pull request!
PR URL: https://github.com/user/raindrop-hackathon-11-08-2025/pull/123
```

```
The pull request has been created at:
https://github.com/user/raindrop-hackathon-11-08-2025/pull/123
```

```markdown
Pull request: https://github.com/user/raindrop-hackathon-11-08-2025/pull/123
```

**Your entire response MUST be just the PR URL, nothing else.**

## Example PR Bodies

### Feature PR
```markdown
## Summary
Implements bidirectional sync service between basic-memory (local) and Raindrop (remote) for per-user knowledge storage. This enables local-first knowledge operations with cloud backup.

## Changes
- Added `api/knowledge/sync.ts` with sync service class
- Implemented `syncToRaindrop()` and `syncFromRaindrop()` methods
- Added integration tests for sync operations
- Updated `api/shared/index.ts` to export sync utilities

## Issue Relationships
- Closes #42
- Related to #25 (uses Raindrop MCP tools)
- Enables #74 (knowledge-based chat)

## Validation Evidence

### Validation Level: 2
**Justification**: New feature with API integration requiring real service testing

**Commands Run**:
- ✅ `bun run lint` - passed
- ✅ `bun run typecheck` - passed
- ✅ `bun test --filter integration` - 12/12 tests passed

### Real-Service Evidence
Raindrop MCP integration verified via working memory:
- `put-memory` calls storing knowledge entries: [timestamp] session_id=abc123 success
- `get-memory` retrievals with filtering: [timestamp] returned 5 entries
- Bidirectional sync confirmed: local → remote → local integrity maintained

## Testing
- Unit tests for sync logic
- Integration tests with real Raindrop MCP server
- Manual testing: added 10 knowledge entries, synced, verified in Raindrop storage
```

### Bug Fix PR
```markdown
## Summary
Fixes race condition in tool builder where concurrent tool creation requests could overwrite each other's authentication state. Added mutex-based locking and improved state isolation.

## Changes
- Added mutex lock to `api/tooling/builder.ts`
- Isolated auth state per tool creation request
- Added regression tests for concurrent creation
- Updated error handling for lock timeouts

## Issue Relationships
- Closes #127
- Related to #56 (dynamic tool creation feature)

## Validation Evidence

### Validation Level: 2
**Justification**: Bug fix with integration testing to prevent regression

**Commands Run**:
- ✅ `bun run lint` - passed
- ✅ `bun run typecheck` - passed
- ✅ `bun test --filter integration` - 18/18 tests passed (includes 3 new regression tests)

### Real-Service Evidence
Concurrent tool creation stress test:
- Created 5 tools simultaneously (Slack, GitHub, Gmail, Calendar, Notion)
- All tools received unique auth states
- No state corruption observed
- Verified via Raindrop storage logs showing distinct tool configurations

## Testing
- Regression test: concurrent tool creation (3 simultaneous requests)
- Manual test: rapid successive tool creation via UI
- Verified: each tool maintains isolated OAuth state
```

## After PR Creation

The PR is ready for review. Next steps:
1. Assign reviewers if needed
2. Monitor CI/CD checks
3. Address review feedback
4. Merge when approved

Do NOT merge automatically.
