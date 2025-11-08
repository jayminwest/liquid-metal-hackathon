# Create Maintenance/Chore Plan

Draft a plan for maintenance tasks, refactoring, or technical debt.

## CRITICAL: Worktree Path Requirements

This command may execute in an isolated git worktree (e.g., `/project/trees/chore-123-abc12345`).

**ALL file paths MUST be relative to CWD (worktree root):**
- ✅ Correct: `docs/specs/chore-123-slug.md`
- ❌ Wrong: `/project/trees/chore-123-abc12345/docs/specs/chore-123-slug.md`

## Prerequisites

1. Issue must exist and be verified: `gh issue view <number>`
2. Issue must have all 4 label categories (component, priority, effort, status)

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

### 3. Research Scope

Use Glob and Grep to understand:
- Current state of code to be refactored/maintained
- Patterns to follow or improve
- Test coverage that needs to be maintained
- Dependencies that might be affected

### 4. Identify Issue Relationships

Review `.claude/commands/docs/issue-relationships.md` and determine:
- **Depends On**: Does this unblock other work?
- **Related To**: Other maintenance tasks in same area?
- **Blocks**: What work is waiting on this cleanup?

### 5. Create Chore Plan

Generate plan at: `docs/specs/chore-<number>-<slug>.md`

**Structure:**

```markdown
# Chore Plan: [Concise Description]

## Context
**Issue**: #<number>
**Type**: [refactor/dependency-update/tooling/cleanup/documentation]
**Component**: [affected component]

### Current State
[What needs maintenance/improvement?]

### Desired State
[What will it look like after?]

### Why This Matters
[Impact on codebase, team, or future work]

## Issue Relationships
- **Depends On**: #XX (description) - Prerequisite work
- **Related To**: #YY (description) - Related maintenance
- **Blocks**: #ZZ (description) - What this unblocks

## Technical Approach

### Changes Overview
[High-level description of the work]

### Impact Areas
- [Area 1]: [How it's affected]
- [Area 2]: [How it's affected]

### Breaking Changes
[Any breaking changes? How will they be handled?]

## Relevant Files

### Files to Modify
- `path/to/file1.ts` - [what changes]
- `path/to/file2.ts` - [what changes]

### Files to Remove
- `path/to/old-file.ts` - [why removing]

### New Files
- `path/to/new-file.ts` - [purpose]

## Task Breakdown

1. **[Task Name]** (Effort: small/medium/large)
   - Description: [what to do]
   - Files: [affected files]
   - Validation: [how to verify]

2. **[Task Name]** (Effort: small/medium/large)
   - Description: [what to do]
   - Files: [affected files]
   - Validation: [how to verify]

[Continue for all tasks...]

## Step by Step Tasks

1. [First step]
2. [Second step]
3. [Third step]
[...]

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| [Specific risk] | High/Med/Low | [How to handle] |

## Validation Strategy

### Validation Level: [1/2/3]

**Justification**: [Why this level - chores often use Level 2 to ensure no regressions]

- **Level 1 (Quick)**: lint + typecheck
  - Use when: Documentation updates, config changes
- **Level 2 (Integration)**: Level 1 + integration tests *(DEFAULT)*
  - Use when: Code refactoring, dependency updates
- **Level 3 (Release)**: Level 2 + all tests + build
  - Use when: Major refactors, architectural changes

### Validation Commands
```bash
bun run lint
bun run typecheck
bun test --filter integration
```

### Regression Verification
- [ ] [Specific functionality to verify still works]
- [ ] [Integration point to test]
- [ ] [Performance check if relevant]

## Success Criteria
- [ ] [Specific criterion 1]
- [ ] [Specific criterion 2]
- [ ] All tests pass
- [ ] No regressions introduced
- [ ] Documentation updated if needed
```

## Output Format

**CRITICAL**: Return ONLY the plan file path as plain text.

### Correct Output
```
docs/specs/chore-123-refactor-sync-layer.md
```

### Incorrect Output
❌ Do NOT include:
- Explanatory text
- Markdown formatting
- Preambles or postambles

**Your entire response MUST be just the file path, nothing else.**

## After Plan Creation

The plan is now ready for review. The user or automation will:
1. Review the plan
2. Verify no unintended breaking changes
3. Execute with `/workflows/implement`

Do NOT proceed to implementation automatically.
