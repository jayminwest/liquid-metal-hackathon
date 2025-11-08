# Complex Task Planning Workflow

You are planning a complex task that requires multiple steps. Create a structured plan to guide implementation.

## Prerequisites

Before planning:
1. Ensure you understand the task scope
2. Review relevant documentation (use `/docs/conditional_docs` to determine which layer docs to load)
3. Search codebase for related patterns (use Glob/Grep)
4. Check for existing issues that may be related

## Planning Process

### 1. Clarify Requirements
- What is the primary goal?
- What are the constraints?
- Are there dependencies on other work?

### 2. Research Codebase Patterns
- Use Glob to find similar implementations
- Use Grep to search for relevant code patterns
- Identify files that will need modification

### 3. Break Down Into Steps
Create a task breakdown with:
- Clear, actionable steps
- Dependencies between steps
- Estimated complexity (small/medium/large)
- Validation criteria for each step

### 4. Identify Risks
- Technical challenges
- Potential breaking changes
- External dependencies
- Integration points

## Plan Structure

Create a plan document with the following sections:

```markdown
# Plan: [Concise Task Name]

## Overview
[2-3 sentences describing the goal]

## Issue Relationships (if applicable)
- **Depends On**: #XX (description) - Why it's required
- **Related To**: #YY (description) - Shared context
- **Blocks**: #ZZ (description) - Downstream impact

## Technical Approach
[How will you solve this? What patterns will you use?]

## Relevant Files

### Files to Modify
- `path/to/file1.ts` - [what changes]
- `path/to/file2.ts` - [what changes]

### New Files
- `path/to/new-file.ts` - [purpose]

## Task Breakdown

1. **[Step 1 Name]** (Complexity: small/medium/large)
   - Description: [what to do]
   - Files: [affected files]
   - Validation: [how to verify]

2. **[Step 2 Name]** (Complexity: small/medium/large)
   - Description: [what to do]
   - Files: [affected files]
   - Validation: [how to verify]

[Continue for all steps...]

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| [Risk description] | High/Medium/Low | [How to handle] |

## Validation Strategy

### Validation Level: [1/2/3]
- **Level 1 (Quick)**: lint + typecheck (for docs-only, config changes)
- **Level 2 (Integration)**: Level 1 + integration tests (DEFAULT for features)
- **Level 3 (Release)**: Level 2 + all tests + build (for schema, auth, migrations)

**Justification**: [Why this level is appropriate]

### Validation Commands
```bash
# Commands to run for validation
bun run lint
bun run typecheck
bun test --filter integration
```

## Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
```

## Output

Present the plan to the user for review. Ask:
- Does this approach make sense?
- Are there any concerns or adjustments needed?
- Should we proceed with implementation?

If approved, suggest using `/workflows/implement` to execute the plan.
