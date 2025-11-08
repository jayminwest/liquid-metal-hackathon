# Implementation Workflow

Execute a plan without scope deviation. This command should be used after creating a plan with `/workflows/plan` or an issue plan with `/issues/feature`, `/issues/bug`, or `/issues/chore`.

## CRITICAL: Read Before Executing

1. **Read the entire plan** before making any changes
2. **Consult conditional docs** (api.md for backend, interaction.md for frontend)
3. **Execute in documented order** - follow the task breakdown sequence
4. **Stay within scope** - do not add features or changes not in the plan
5. **Create incremental commits** after logical units of work
6. **Avoid meta-commentary** in commit messages (no "based on", "this commit", etc.)

## Implementation Process

### Phase 1: Preparation
1. Ensure working tree is clean: `git status`
2. Confirm you're on the correct branch
3. Review the full plan document
4. Load layer-specific docs if needed:
   - For api/knowledge, api/tooling, api/shared: Read `.claude/commands/docs/conditional_docs/api.md`
   - For interaction/ (frontend): Read `.claude/commands/docs/conditional_docs/interaction.md` (if exists)

### Phase 2: Execute Plan Tasks

For each task in the plan's Task Breakdown:
1. **Implement the changes** as specified
2. **Test incrementally** (don't wait until the end)
3. **Create a commit** after completing a logical unit:
   - Use `/git/commit` to generate proper commit message
   - Stage only relevant files
   - Keep commits focused and atomic
4. **Update progress** in your todo list

### Phase 3: Validation

Before marking implementation complete:

1. **Select Validation Level** (from plan):
   - **Level 1 (Quick)**: lint + typecheck
     - Use for: docs-only, config changes
   - **Level 2 (Integration)**: Level 1 + integration tests (DEFAULT)
     - Use for: new features, API changes, most work
   - **Level 3 (Release)**: Level 2 + all tests + build
     - Use for: schema changes, auth changes, migrations

2. **Run Validation Commands**:
```bash
# Level 1
bun run lint
bun run typecheck

# Level 2 (includes Level 1)
bun run lint
bun run typecheck
bun test --filter integration

# Level 3 (includes Level 2)
bun run lint
bun run typecheck
bun test
bun run build
```

3. **Capture Evidence**:
   - Note pass/fail status for each command
   - For Level 2+: Capture real-service evidence (e.g., Supabase logs, API responses)
   - Note test counts (e.g., "133/133 tests passed")

4. **Fix Any Failures**:
   - Address lint/type errors
   - Fix failing tests
   - Do NOT proceed if validation fails

### Phase 4: Review Changes

1. **Review diff**: `git diff --stat`
2. **Verify all plan tasks completed**
3. **Check for unintended changes** or scope creep
4. **Ensure commits follow Conventional Commits format**

## DO NOT Push or Create PR

The build phase (or manual workflow) handles:
- Pushing branch to remote
- Creating pull requests
- PR description generation

Your job is to implement and validate only.

## Output Format

Provide a bullet list summary (NO markdown headers, preambles, or formatting):

```
- Modified api/knowledge/sync.ts: added bidirectional sync service (87 lines)
- Created api/knowledge/sync.test.ts: 12 integration tests added
- Modified api/shared/index.ts: exported sync utilities (3 exports)
- Validation: Level 2 selected (feature with new API endpoints)
- Commands executed: lint (pass), typecheck (pass), integration tests (pass, 145/145)
- Real-service evidence: Raindrop API logs show successful put-memory/get-memory calls
- git diff --stat: 5 files changed, 203 insertions(+), 18 deletions(-)
- Commits created: 3 (sync-service, sync-tests, exports)
- Implementation complete, ready for PR creation
```

## Anti-Patterns to Avoid

❌ **Don't:**
- Skip reading the plan
- Add features not in the plan
- Use meta-commentary in commits ("based on the changes...")
- Create PR or push (that's the build phase's job)
- Skip validation
- Batch all changes into one massive commit

✅ **Do:**
- Read entire plan first
- Follow task order
- Create focused commits
- Run full validation
- Stay within documented scope
- Capture real-service evidence
