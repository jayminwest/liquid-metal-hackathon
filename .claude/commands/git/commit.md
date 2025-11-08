# Generate Commit Message

Generate a validated commit message following Conventional Commits format.

## CRITICAL Output Format Rules

**Your ENTIRE response IS the commit message.**
- First character MUST be a valid type (feat, fix, chore, docs, test, refactor, perf, ci, build, style)
- NO preamble, postamble, or explanation
- NO meta-commentary patterns

## Format

```
<type>: <issue_number> - <description>
```

## Validation Rules

### 1. Conventional Commits Type
Must be one of:
- `feat` - New feature
- `fix` - Bug fix
- `chore` - Maintenance, refactoring
- `docs` - Documentation only
- `test` - Adding or updating tests
- `refactor` - Code restructuring without behavior change
- `perf` - Performance improvement
- `ci` - CI/CD changes
- `build` - Build system or dependencies
- `style` - Formatting, missing semicolons (no code change)

### 2. Length Constraints
- Subject line ≤ 60 characters (maximum 72)
- If description is too long, abbreviate but keep it clear

### 3. FORBIDDEN Meta-Commentary

❌ Do NOT use these patterns:
- "based on"
- "the commit should"
- "here is"
- "this commit"
- "i can see"
- "looking at"
- "the changes"
- "let me"

These will fail validation in automation/adws/adw_modules/validation.py

## Process

1. **Review staged changes**: Examine `git diff --staged`
2. **Identify primary change**: What's the main thing this commit does?
3. **Select type**: Choose appropriate conventional type
4. **Write description**: Imperative mood, concise, no meta-commentary
5. **Check length**: Ensure ≤ 60 characters (max 72)

## Examples

### ✅ Correct

```
feat: 42 - add knowledge sync service
```

```
fix: 127 - resolve race condition in tool builder
```

```
chore: 89 - refactor API error handling
```

```
docs: 56 - update PRD with MCP architecture
```

### ❌ Incorrect

```
Based on the changes, the commit message should be:
feat: 42 - add knowledge sync service
```

```
This commit adds the knowledge sync service (feat: 42 - add knowledge sync service)
```

```
Looking at the diff, I can see that we added a sync service, so the commit should be: feat: 42 - add knowledge sync service
```

```
feat: 42 - this commit implements a new knowledge synchronization service that syncs between basic-memory and Raindrop storage
```
(Too long - exceeds 60 character limit)

## Issue Number

- If working on a GitHub issue, include the number: `feat: 123 - description`
- If no issue, omit the number: `feat: add initial project structure`

## Validation

Before outputting, verify:
- ✅ Starts with valid type
- ✅ Includes issue number if applicable
- ✅ Subject ≤ 60 characters (max 72)
- ✅ Imperative mood ("add" not "added" or "adds")
- ✅ No meta-commentary
- ✅ No preamble or explanation

## Remember

**Your response IS the commit message. Nothing else.**
