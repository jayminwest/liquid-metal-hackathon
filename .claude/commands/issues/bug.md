# Create Bug Fix Plan

Draft a remediation plan for a bug issue.

## CRITICAL: Worktree Path Requirements

This command may execute in an isolated git worktree (e.g., `/project/trees/fix-123-abc12345`).

**ALL file paths MUST be relative to CWD (worktree root):**
- ✅ Correct: `docs/specs/bug-123-slug.md`
- ❌ Wrong: `/project/trees/fix-123-abc12345/docs/specs/bug-123-slug.md`

## Prerequisites

1. Issue must exist and be verified: `gh issue view <number>`
2. Issue must have all 4 label categories (component, priority, effort, status)
3. Bug should be reproducible or have clear reproduction steps

## Execution Flow

### 1. Verify Issue Labels
```bash
gh issue view <number> --json labels,body,title
```

Confirm labels from all 4 categories exist. If missing, abort and ask user to fix labels first.

### 2. Load Conditional Documentation

Based on the component label:
- `component:api`, `component:backend`, `component:database` → Read `.claude/commands/docs/conditional_docs/api.md`
- `component:frontend` → Read `.claude/commands/docs/conditional_docs/interaction.md` (if exists)

### 3. Research Bug Context

Use Glob and Grep to investigate:
- Find files mentioned in the bug report
- Search for error messages or stack traces
- Identify related code paths
- Look for similar past fixes (git log, closed issues)

### 4. Reproduce the Bug

Understand:
- Exact reproduction steps
- Expected vs actual behavior
- Error messages or logs
- Environment/conditions where bug occurs

### 5. Identify Issue Relationships

Review `.claude/commands/docs/issue-relationships.md` and determine:
- **Depends On**: Are there prerequisite fixes needed?
- **Related To**: Other bugs with similar root cause?
- **Blocks**: What features/work is blocked by this bug?

### 6. Create Bug Fix Plan

Generate plan at: `docs/specs/bug-<number>-<slug>.md`

**Structure:**

```markdown
# Bug Fix Plan: [Concise Description]

## Bug Summary
**Issue**: #<number>
**Title**: [Bug title from GitHub]
**Priority**: [critical/high/medium/low]
**Component**: [affected component]

### Observed Behavior
[What is happening - be specific]

### Expected Behavior
[What should happen instead]

### Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Bug manifests here]

## Issue Relationships
- **Depends On**: #XX (description) - Must fix this first
- **Related To**: #YY (description) - Similar root cause or shared component
- **Blocks**: #ZZ (description) - Unblocks this work

## Root Cause Analysis

### Investigation Findings
[What did you discover? Where is the bug?]

### Files Affected
- `path/to/buggy-file.ts:123` - [Description of the issue]
- `path/to/related-file.ts:456` - [How it's involved]

### Why This Happened
[Root cause explanation - missing validation, race condition, incorrect logic, etc.]

## Fix Strategy

### Approach
[How will you fix this? Be specific about the changes]

### Changes Required
1. **[File/Module Name]**
   - Change: [What will be modified]
   - Reason: [Why this fixes the bug]

2. **[File/Module Name]**
   - Change: [What will be modified]
   - Reason: [Why this is necessary]

### Alternative Approaches Considered
[If any - why weren't they chosen?]

## Relevant Files

### Files to Modify
- `path/to/file1.ts` - [specific changes]
- `path/to/file2.ts` - [specific changes]

### New Files (if needed)
- `path/to/test.ts` - [regression test to prevent recurrence]

## Task Breakdown

1. **Fix Primary Issue** (Effort: small/medium/large)
   - Description: [Implement core fix]
   - Files: [files to change]
   - Validation: [How to verify fix works]

2. **Add Regression Tests** (Effort: small/medium/large)
   - Description: [Prevent bug from recurring]
   - Files: [test files]
   - Validation: [Tests must fail before fix, pass after]

3. **Update Related Code** (Effort: small/medium/large)
   - Description: [Any defensive programming or related improvements]
   - Files: [affected files]
   - Validation: [How to verify]

## Step by Step Tasks

1. [First step - often "reproduce bug locally"]
2. [Second step - implement core fix]
3. [Third step - add tests]
4. [Fourth step - verify no regressions]
5. [Final step - validate fix]

## Regression Risks

### Areas to Test
- [Component/feature that might break]
- [Related functionality to verify]

### Regression Tests
- [ ] [Specific test case 1]
- [ ] [Specific test case 2]
- [ ] [Original bug reproduction - must not occur]

## Validation Strategy

### Validation Level: [1/2/3]

**Justification**: [Why this level - bugs often need Level 2+ to ensure no regressions]

- **Level 1 (Quick)**: lint + typecheck
  - Use when: Typo fixes, documentation bugs
- **Level 2 (Integration)**: Level 1 + integration tests *(DEFAULT for bugs)*
  - Use when: Logic bugs, API bugs, most fixes
- **Level 3 (Release)**: Level 2 + all tests + build
  - Use when: Critical bugs, security fixes, data integrity issues

### Validation Commands
```bash
# Reproduce bug first (should fail)
[command to trigger bug]

# After fix (should pass)
bun run lint
bun run typecheck
bun test --filter integration
[command to verify fix]
```

### Bug Verification
**Before Fix**: [What happens when bug is present]
**After Fix**: [What happens when bug is fixed]

## Success Criteria
- [ ] Bug can no longer be reproduced
- [ ] Regression tests added and passing
- [ ] No new bugs introduced
- [ ] Related functionality still works
- [ ] All validation commands pass
```

## Output Format

**CRITICAL**: Return ONLY the plan file path as plain text.

### Correct Output
```
docs/specs/bug-123-sync-race-condition.md
```

### Incorrect Output
❌ Do NOT include any of these:
```
Created bug fix plan at: docs/specs/bug-123-sync-race-condition.md
```
```
The plan has been created at `docs/specs/bug-123-sync-race-condition.md`
```
```markdown
Plan: docs/specs/bug-123-sync-race-condition.md
```

**Your entire response MUST be just the file path, nothing else.**

## After Plan Creation

The plan is now ready for review. The user or automation will:
1. Review the plan and root cause analysis
2. Verify fix approach is sound
3. Execute with `/workflows/implement`

Do NOT proceed to implementation automatically.
