# Create Feature Plan

Draft an implementation plan for a feature issue.

## CRITICAL: Worktree Path Requirements

This command may execute in an isolated git worktree (e.g., `/project/trees/feat-123-abc12345`).

**ALL file paths MUST be relative to CWD (worktree root):**
- ✅ Correct: `docs/specs/feature-123-slug.md`
- ❌ Wrong: `/project/trees/feat-123-abc12345/docs/specs/feature-123-slug.md`

## Prerequisites

1. Issue must exist and be verified: `gh issue view <number>`
2. Issue must have all 4 label categories (component, priority, effort, status)
3. Working directory should be clean or in a dedicated worktree

## Execution Flow

### 1. Verify Issue Labels
```bash
gh issue view <number> --json labels
```

Confirm labels from all 4 categories exist. If missing, abort and ask user to fix labels first.

### 2. Load Conditional Documentation

Based on the component label:
- `component:api`, `component:backend`, `component:database` → Read `.claude/commands/docs/conditional_docs/api.md`
- `component:frontend` → Read `.claude/commands/docs/conditional_docs/interaction.md` (if exists)

### 3. Research Codebase Patterns

Use Glob and Grep to understand existing patterns:
```bash
# Find similar features
# Search for related functionality
# Identify files that will need modification
```

Example:
- If feature is "knowledge sync", search for existing sync patterns
- If feature is "tool creation", look for similar dynamic generation code
- Identify naming conventions, file structures, test patterns

### 4. Identify Issue Relationships

Review `.claude/commands/docs/issue-relationships.md` and determine:
- **Depends On**: What issues MUST be completed first? (hard blockers)
- **Related To**: What issues share context? (helpful but not blocking)
- **Blocks**: What downstream issues depend on this?

Check existing issues:
```bash
gh issue list --state all --search "<related keywords>" --limit 20
```

### 5. Create Feature Plan

Generate plan at: `docs/specs/feature-<number>-<slug>.md`

**Structure:**

```markdown
# Feature Plan: [Concise Name]

## Overview
[2-3 sentences: what is this feature and why does it matter?]

## Issue Relationships
- **Depends On**: #XX (description) - Why it's required before starting
- **Related To**: #YY (description) - Shared context or components
- **Blocks**: #ZZ (description) - What downstream work depends on this

## Technical Approach
[How will you implement this? What patterns will you use?]

### Architecture Changes
[Any new components, services, or structural changes]

### Integration Points
[Where does this connect to existing code?]

### Data Model
[Any new types, interfaces, database schema]

## Relevant Files

### Files to Modify
- `path/to/file1.ts` - [what changes and why]
- `path/to/file2.ts` - [what changes and why]

### New Files
- `path/to/new-file.ts` - [purpose and contents]
- `path/to/new-test.ts` - [test coverage]

## Task Breakdown

1. **[Task Name]** (Effort: small/medium/large)
   - Description: [what to implement]
   - Files: [affected files]
   - Validation: [how to verify this step]
   - Dependencies: [any prerequisite tasks]

2. **[Task Name]** (Effort: small/medium/large)
   - Description: [what to implement]
   - Files: [affected files]
   - Validation: [how to verify this step]
   - Dependencies: [any prerequisite tasks]

[Continue for all tasks...]

## Step by Step Tasks

Ordered implementation sequence:
1. [First step]
2. [Second step]
3. [Third step]
[...]

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| [Specific risk] | High/Med/Low | [How to handle it] |
| [Example: Breaking change to API] | High | [Add deprecation period, versioning] |

## Validation Strategy

### Validation Level: [1/2/3]

**Justification**: [Why this level is appropriate for this feature]

- **Level 1 (Quick)**: lint + typecheck
  - Use when: Config-only, docs-only
- **Level 2 (Integration)**: Level 1 + integration tests *(DEFAULT)*
  - Use when: New features, API changes, most work
- **Level 3 (Release)**: Level 2 + all tests + build
  - Use when: Schema changes, auth changes, migrations

### Validation Commands
```bash
# List specific commands that will be run
bun run lint
bun run typecheck
bun test --filter integration
# Add any feature-specific validation
```

### Real-Service Evidence (Level 2+ only)
[What external service interactions to capture - e.g., Raindrop API logs, database queries]

## Success Criteria
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]
- [ ] All validation commands pass
- [ ] Real-service evidence captured
```

## Output Format

**CRITICAL**: Return ONLY the plan file path as plain text.

### Correct Output
```
docs/specs/feature-123-knowledge-sync.md
```

### Incorrect Output
❌ Do NOT include any of these:
```
Created plan at: docs/specs/feature-123-knowledge-sync.md
```
```
The plan has been created at `docs/specs/feature-123-knowledge-sync.md`
```
```markdown
Plan file: docs/specs/feature-123-knowledge-sync.md
```

**Your entire response MUST be just the file path, nothing else.**

## After Plan Creation

The plan is now ready for review. The user or automation will:
1. Review the plan
2. Make any adjustments needed
3. Execute with `/workflows/implement`

Do NOT proceed to implementation automatically.
