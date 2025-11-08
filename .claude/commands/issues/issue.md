# Create GitHub Issue

Create a rigorously labeled GitHub issue following the project's taxonomy.

## Required Labels (one from EACH category)

You MUST apply exactly one label from each of these four categories:

### 1. Component
- `component:backend` - Backend API, server-side logic
- `component:api` - API layer (knowledge, tooling)
- `component:database` - Data storage, sync, basic-memory
- `component:testing` - Test infrastructure, test files
- `component:ci-cd` - Build, deployment, automation
- `component:documentation` - Docs, README, guides
- `component:observability` - Logging, monitoring, debugging
- `component:frontend` - UI, interaction layer

### 2. Priority
- `priority:critical` - Blocker, system broken, security issue
- `priority:high` - Important for next milestone, significant impact
- `priority:medium` - Should be done soon, normal priority
- `priority:low` - Nice to have, can be deferred

### 3. Effort
- `effort:small` - < 2 hours, simple change
- `effort:medium` - 2-8 hours, moderate complexity
- `effort:large` - > 8 hours, complex or multi-part work

### 4. Status
- `status:needs-investigation` - Requires research or diagnosis
- `status:blocked` - Cannot proceed due to dependency
- `status:ready` - Ready to implement
- `status:in-progress` - Currently being worked on

## Execution Flow

### 1. Check for Duplicates
```bash
git fetch --all --prune
gh issue list --search "<keywords>" --state all --limit 20
```
Review results to ensure this issue doesn't already exist.

### 2. Verify Label Taxonomy
```bash
gh label list --limit 100
```
Confirm all required labels exist. If missing, alert the user.

### 3. Review Conditional Docs
Based on the component:
- For `component:api`, `component:backend`, `component:database`: Read `.claude/commands/docs/conditional_docs/api.md`
- For `component:frontend`: Read `.claude/commands/docs/conditional_docs/interaction.md` (if exists)

### 4. Identify Issue Relationships

Review `.claude/commands/docs/issue-relationships.md` and identify:
- **Depends On**: What must be completed first? (hard blockers)
- **Related To**: What provides useful context? (not blockers)
- **Blocks**: What downstream work depends on this?
- **Child Of**: Is this part of a larger epic?

### 5. Create Issue

Format the issue body with this structure:

```markdown
## Summary
[1-2 paragraphs describing the issue/feature/bug]

## Issue Relationships
- **Depends On**: #XX (description) - Why it blocks this work
- **Related To**: #YY (description) - Shared context
- **Blocks**: #ZZ (description) - Downstream impact

## Context
[Additional background, why this matters]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Additional Notes
[Any other relevant information]
```

Create the issue:
```bash
gh issue create \
  --title "<type>: <concise description>" \
  --body-file /tmp/issue-body.md \
  --label "component:xxx,priority:xxx,effort:xxx,status:xxx"
```

### 6. Verify Issue Creation
```bash
gh issue view <number>
```

Confirm all 4 label categories are present. If any missing, update:
```bash
gh issue edit <number> --add-label "missing:label"
```

## Output Format

Return JSON with issue details:

```json
{
  "number": 123,
  "title": "feat: add knowledge sync service",
  "summary": "Implement bidirectional sync between basic-memory and Raindrop storage",
  "labels": ["component:api", "priority:high", "effort:medium", "status:ready"],
  "relationships": {
    "depends_on": [],
    "related_to": [25],
    "blocks": [74, 116]
  },
  "url": "https://github.com/user/repo/issues/123"
}
```

## Validation

Before completing:
- ✅ Issue has all 4 label categories
- ✅ Title follows conventional format (`type: description`)
- ✅ Body includes Issue Relationships section
- ✅ Acceptance criteria are specific and testable
- ✅ No duplicate issues exist

## Common Issue Types

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `docs:` - Documentation
- `test:` - Testing improvements
- `chore:` - Maintenance, tooling
- `perf:` - Performance improvement
- `ci:` - CI/CD changes
