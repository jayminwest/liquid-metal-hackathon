# Issue Relationship Tracking

Track dependencies and context between GitHub issues to prevent wasted effort and enable intelligent prioritization.

## Why Track Issue Relationships?

### For Humans
- **Avoid Blocked Work**: Don't start work that depends on incomplete issues
- **Understand Context**: See related issues that provide useful background
- **Faster Onboarding**: New team members quickly understand dependencies
- **Better Planning**: Visualize dependency graphs for sprint planning

### For AI Agents
- **Automatic Context Discovery**: Agents can load related issues automatically
- **Dependency Validation**: Check if prerequisite work is complete before starting
- **Scope Detection**: Understand the full scope of changes needed
- **Priority-Aware Workflows**: Suggest work order based on dependencies

### For Project Management
- **Dependency Graphs**: Visualize blocking relationships
- **Epic Progress**: Track completion of related issues under an epic
- **Risk Assessment**: Identify bottlenecks and critical paths

---

## Relationship Types

### 1. Depends On (Hard Blocker)
**Definition**: Issues that MUST be completed before starting the current issue.

**When to use:**
- Current issue cannot start without this work
- Technical prerequisite (e.g., need API before UI)
- Foundation must exist first

**Example:**
```markdown
- **Depends On**: #25 (API key generation) - Required for authentication flow
```

**Impact**: If #25 is not complete, do NOT start this issue.

---

### 2. Related To (Contextual)
**Definition**: Issues that provide useful context but are NOT blockers.

**When to use:**
- Shares the same component/area
- Similar technical approach
- Provides helpful background
- Reference implementation

**Example:**
```markdown
- **Related To**: #26 (rate limiting) - Both touch authentication middleware
```

**Impact**: Review #26 for context, but can proceed without it being complete.

---

### 3. Blocks (Downstream Dependency)
**Definition**: Issues that are waiting on the current issue to be completed.

**When to use:**
- Other work depends on this issue
- Downstream features need this foundation
- Identifies impact of delays

**Example:**
```markdown
- **Blocks**: #74, #116 (symbol extraction, dependency search) - Provides AST foundation
```

**Impact**: Completing this issue unblocks #74 and #116.

---

### 4. Supersedes (Replacement)
**Definition**: Current issue replaces or obsoletes a previous issue.

**When to use:**
- New approach replaces old approach
- Better solution found
- Consolidating duplicate issues

**Example:**
```markdown
- **Supersedes**: #32 (old sync implementation) - New bidirectional approach
```

**Impact**: Close #32 when this issue is complete.

---

### 5. Child Of (Epic Membership)
**Definition**: This issue is part of a larger epic or feature.

**When to use:**
- Breaking down large features
- Tracking progress on multi-part work
- Organizing related issues under one umbrella

**Example:**
```markdown
- **Child Of**: #15 (Dynamic Tool Creation Epic) - Part of OAuth flow implementation
```

**Impact**: Epic #15 is complete only when all children are complete.

---

### 6. Follow-Up (Planned Next Steps)
**Definition**: Issues to be created or addressed after this one, but NOT blockers.

**When to use:**
- Known improvements that can come later
- Technical debt to address eventually
- Future enhancements

**Example:**
```markdown
- **Follow-Up**: Performance optimization of sync service (not blocking)
```

**Impact**: Track future work without blocking current progress.

---

## Format in Issue Bodies

Add an "Issue Relationships" section to every issue with dependencies:

```markdown
## Issue Relationships

- **Depends On**: #XX (short description) - Why it's required
- **Related To**: #YY (short description) - How it provides context
- **Blocks**: #ZZ1, #ZZ2 (short description) - What depends on this
- **Child Of**: #AA (epic name) - What larger work this belongs to
```

**Example:**

```markdown
## Issue Relationships

- **Depends On**: #25 (API key generation) - Required for OAuth implementation
- **Related To**: #26 (rate limiting) - Shares middleware architecture
- **Blocks**: #74, #116 (symbol extraction, dependency search) - Provides AST parsing foundation
- **Child Of**: #10 (Code Intelligence Epic) - Part of codebase analysis feature set
```

---

## Usage Patterns

### Creating a New Issue

When creating an issue with `/issues/issue`:

1. **Search for related issues**:
   ```bash
   gh issue list --search "<keywords>" --state all
   ```

2. **Identify dependencies**:
   - What must exist first? → Depends On
   - What provides useful context? → Related To
   - What is this blocking? → Blocks

3. **Add to issue body**:
   ```markdown
   ## Issue Relationships
   - **Depends On**: #XX - ...
   - **Related To**: #YY - ...
   ```

---

### Creating a Feature Plan

When using `/issues/feature`:

1. **Load relationship context**:
   ```bash
   gh issue view <number> --json body
   ```

2. **Check dependency status**:
   ```bash
   gh issue view 25 --json state  # Is dependency complete?
   ```

3. **Include in plan**:
   ```markdown
   ## Issue Relationships
   - **Depends On**: #25 (API key generation) - Status: closed ✅
   - **Related To**: #26 (rate limiting) - Status: open (review for patterns)
   ```

4. **Validate before starting**:
   - All "Depends On" issues must be closed
   - If not, block and notify user

---

### For AI Agents

When an agent encounters an issue with relationships:

**Automatic Context Loading:**
```python
def load_issue_context(issue_number):
    # Get issue body
    issue = gh_api.get_issue(issue_number)

    # Parse relationships
    relationships = parse_relationships(issue.body)

    # Load "Depends On" issues (must check status)
    for dep in relationships.get('depends_on', []):
        dep_issue = gh_api.get_issue(dep['number'])
        if dep_issue.state != 'closed':
            raise BlockedError(f"Cannot start: depends on #{dep['number']} which is still open")

    # Load "Related To" issues (for context)
    context_issues = []
    for rel in relationships.get('related_to', []):
        context_issues.append(gh_api.get_issue(rel['number']))

    return {
        'issue': issue,
        'blocked': False,
        'context': context_issues
    }
```

---

## Dependency Graph Visualization

**Conceptual Example:**

```
Epic: Dynamic Tool Creation (#10)
├── API Key Storage (#25) [closed]
│   └── Blocks: OAuth Flow (#42) [in-progress]
├── OAuth Flow (#42) [in-progress]
│   ├── Depends On: #25
│   ├── Blocks: #74, #116
│   └── Related To: #26
└── Tool Registry (#58) [open]
    └── Depends On: #42
```

**Reading the graph:**
- #25 is complete → #42 can proceed
- #42 is in progress → #74, #116 are blocked
- #58 depends on #42 → cannot start yet

---

## Examples

### Example 1: Knowledge Sync Feature

```markdown
## Issue Relationships

- **Depends On**: #12 (basic-memory setup) - Need local storage initialized
- **Related To**: #18 (Raindrop MCP integration) - Uses same MCP tools
- **Blocks**: #35 (Knowledge-based chat) - Chat needs sync service to function
- **Child Of**: #5 (Knowledge Storage Epic) - Part of knowledge layer implementation
```

---

### Example 2: Dynamic Tool Creation

```markdown
## Issue Relationships

- **Depends On**:
  - #25 (API key storage) - Required for storing OAuth tokens
  - #18 (Raindrop MCP integration) - Need MCP client for tool registry
- **Related To**: #26 (rate limiting) - Both use middleware patterns
- **Blocks**:
  - #74 (Slack integration) - Uses tool creation framework
  - #82 (GitHub integration) - Uses tool creation framework
- **Child Of**: #10 (Dynamic Tool Creation Epic)
```

---

### Example 3: Bug Fix

```markdown
## Issue Relationships

- **Related To**: #56 (dynamic tool creation feature) - Bug occurs in this component
- **Blocks**: #89 (production deployment) - Must fix before releasing
```

---

## Relationship Metadata for AI Agents

For advanced usage, consider adding machine-readable metadata:

```markdown
## Issue Relationships

- **Depends On**: #25 (API key generation) - Required for authentication
  <!-- meta: hard-blocker, status: closed -->
- **Related To**: #26 (rate limiting) - Shares middleware
  <!-- meta: contextual, priority: high -->
- **Blocks**: #74, #116 (symbol extraction, dependency search)
  <!-- meta: downstream, count: 2 -->
```

**AI agents can parse:**
- `hard-blocker` → must check status before starting
- `contextual` → helpful to review but not required
- `downstream` → identify impact of delays

---

## Benefits Summary

### Prevent Wasted Effort
- Don't start work that's blocked
- Don't duplicate effort on related issues
- Don't miss important context

### Enable Smart Workflows
- AI agents automatically load dependencies
- Automated validation of prerequisites
- Intelligent task ordering

### Improve Project Visibility
- See dependency chains at a glance
- Track epic progress systematically
- Identify bottlenecks early

### Scale with Project
- Pattern works for any project size
- Easy to add new relationship types
- Extensible with metadata

---

## Quick Reference

| Relationship | When to Use | Impact |
|--------------|-------------|--------|
| **Depends On** | Must complete first | Hard blocker |
| **Related To** | Provides context | Review for patterns |
| **Blocks** | Waiting on this | Shows downstream impact |
| **Supersedes** | Replaces old issue | Close old when done |
| **Child Of** | Part of epic | Epic completion tracking |
| **Follow-Up** | Future work | Track but don't block |

---

## Integration with Workflow Commands

All issue-related commands should check relationships:

- `/issues/issue` → Add relationships when creating
- `/issues/feature` → Validate dependencies before planning
- `/issues/bug` → Identify related issues for context
- `/issues/chore` → Check what this unblocks

**Validation Pattern:**
```bash
# Before starting work on issue #42
gh issue view 42 --json body | grep "Depends On"
# → "#25 (API key generation)"

gh issue view 25 --json state
# → "closed" ✅ OK to proceed

# → "open" ❌ BLOCKED - notify user
```
