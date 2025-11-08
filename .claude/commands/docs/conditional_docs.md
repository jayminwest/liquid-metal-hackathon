# Conditional Documentation Guide

This guide helps you determine which layer-specific documentation to load based on the work you're doing. Loading only relevant docs minimizes context window usage and improves response quality.

## Documentation Layers

This project has the following documentation layers:

### 1. `api.md` - Backend/API Layer
**When to load:**
- Working on `api/knowledge/**`
- Working on `api/tooling/**`
- Working on `api/shared/**`
- Database/storage changes
- Integration with Raindrop MCP server
- Testing API endpoints
- Adding new API routes

**Coverage:**
- API architecture (knowledge, tooling, shared layers)
- Raindrop MCP server integration
- basic-memory storage patterns
- Authentication/API key handling
- Validation strategies
- Testing approach (anti-mock philosophy)

### 2. `interaction.md` - Frontend/UI Layer
**When to load:**
- Working on `interaction/**`
- Chat interface changes
- Frontend components
- WebSocket/real-time updates
- UI/UX improvements

**Coverage:**
- Chat interface architecture
- User interaction patterns
- Frontend framework usage
- Real-time communication
- Knowledge upload UI
- Tool creation UI flows

## Decision Pattern

Use this decision tree to determine which docs to load:

```
Are you working on backend/API code?
├─ YES → Load api.md
│   ├─ api/knowledge/** → Load api.md (knowledge storage, sync)
│   ├─ api/tooling/** → Load api.md (MCP tool creation)
│   └─ api/shared/** → Load api.md (common utilities)
│
└─ NO → Are you working on frontend/UI?
    ├─ YES → Load interaction.md
    │   └─ interaction/** → Load interaction.md (chat, UI)
    │
    └─ NO → Working on docs/config only?
        └─ No additional docs needed
```

## Universal Documentation

These files should always be consulted when entering the repository:

### `README.md`
**Always load when:**
- New to the repository
- Need to run the project locally
- Verifying environment setup
- Understanding project structure

### `PRD.md`
**Always load when:**
- Understanding project goals and scope
- Checking hackathon priorities
- Verifying feature requirements
- Understanding architecture decisions

### `.claude/commands/docs/issue-relationships.md`
**Load when:**
- Creating specification files with relationship metadata
- Building dependency graphs for prioritization
- Enabling AI agents to discover prerequisite context
- Planning work that may have dependencies

## Examples

### Example 1: Adding Knowledge Sync Feature
**Task**: Implement sync between basic-memory and Raindrop

**Load:**
1. `README.md` - Project setup
2. `PRD.md` - Feature requirements
3. `.claude/commands/docs/conditional_docs/api.md` - API layer patterns

**Why**: Working on `api/knowledge/` layer with Raindrop integration

---

### Example 2: Building Chat Interface
**Task**: Create chat UI for user-agent interaction

**Load:**
1. `README.md` - Project setup
2. `PRD.md` - Feature requirements
3. `.claude/commands/docs/conditional_docs/interaction.md` - Frontend patterns

**Why**: Working on `interaction/` layer

---

### Example 3: Creating GitHub Issue
**Task**: Document a new feature request

**Load:**
1. `.claude/commands/docs/issue-relationships.md` - Relationship patterns

**Why**: Need to identify dependencies and related issues

---

### Example 4: Updating Documentation
**Task**: Update PRD with architecture changes

**Load:**
1. `PRD.md` - Current state

**Why**: Documentation-only change, no code-specific patterns needed

## Benefits

### Reduced Context Window Usage
- Load only 1-2 layer docs instead of all documentation
- Faster response times
- More focused recommendations

### Improved Maintainability
- Clear layer boundaries
- Easy to add new layers (e.g., mobile, CLI)
- Consistent patterns within each layer

### Scalable Pattern
- Add new layers as project grows
- Each layer has self-contained docs
- No need to update all commands when adding layers

## Quick Reference Table

| Working on... | Load these docs |
|---------------|----------------|
| `api/knowledge/**` | README.md, PRD.md, api.md |
| `api/tooling/**` | README.md, PRD.md, api.md |
| `api/shared/**` | README.md, PRD.md, api.md |
| `interaction/**` | README.md, PRD.md, interaction.md |
| `data/**` | README.md, PRD.md, api.md |
| GitHub issues | issue-relationships.md |
| Documentation only | README.md, PRD.md |
| Config/tooling | README.md |

## Adding New Layers

When the project grows and you need to add a new layer:

1. Create `.claude/commands/docs/conditional_docs/<layer>.md`
2. Document layer-specific patterns and conventions
3. Update this file with new decision rules
4. Update issue commands to reference new layer docs

**Example future layers:**
- `mobile.md` - Mobile app layer
- `cli.md` - CLI tool layer
- `sdk.md` - SDK/client library layer
