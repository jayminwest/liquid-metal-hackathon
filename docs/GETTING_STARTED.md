# Getting Started Guide

Quick guide to get your hackathon project running in the next 30 minutes!

## Step 1: Install Dependencies (5 minutes)

### Install Bun
```bash
curl -fsSL https://bun.sh/install | bash
```

### Install Project Dependencies
```bash
cd liquid-metal-hackathon
bun install
```

### Install basic-memory
```bash
bunx @basicmachines/basic-memory
```

## Step 2: Configure Environment (2 minutes)

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
# (Raindrop MCP should already be connected)
nano .env
```

Required variables:
- `RAINDROP_ENDPOINT` - Your Raindrop MCP endpoint
- `RAINDROP_TOKEN` - Your authentication token
- `BASIC_MEMORY_DIR` - Local storage (default: `./data`)

## Step 3: Test the Setup (10 minutes)

### Test basic-memory Connection

Create a test entity manually:

```bash
# The entity files are just Markdown!
cat > data/entities/test-entity.md << 'EOF'
---
title: Test Entity
tags: [test, hackathon]
source: manual
created: 2025-11-08T12:00:00Z
---

# Test Entity

This is a test entity to verify basic-memory is working.

## Observations

- [fact] basic-memory uses Markdown files
- [fact] Files are human-readable and git-friendly

## Relations

- related_to [[basic-memory]]
EOF
```

### Test Raindrop Connection

The Raindrop MCP server should already be connected. Test it:

```bash
# In your Claude Code session, you can verify:
# /mcp should show "raindrop-mcp" as connected
```

### Start the Development Server

```bash
bun run dev
```

You should see:
```
🚀 Server starting on http://0.0.0.0:3000
📚 Knowledge API: http://0.0.0.0:3000/api/knowledge
🔧 Tooling API: http://0.0.0.0:3000/api/tooling
```

### Test the API

In another terminal:

```bash
# Health check
curl http://localhost:3000/health

# Capture knowledge
curl -X POST http://localhost:3000/api/knowledge/capture \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session" \
  -d '{
    "topic": "My First Knowledge",
    "content": "Testing the knowledge capture system",
    "relations": [],
    "observations": [
      {
        "category": "test",
        "text": "This is a test observation"
      }
    ],
    "tags": ["test"],
    "source": "curl",
    "metadata": {}
  }'

# Query knowledge
curl -X POST http://localhost:3000/api/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What did I learn about knowledge?",
    "session_id": "test-session",
    "mode": "hybrid"
  }'

# View recent knowledge
curl http://localhost:3000/api/knowledge/recent
```

## Step 4: Verify Dual Persistence (5 minutes)

### Check basic-memory (Local)

```bash
# View the entity file
cat data/entities/my-first-knowledge.md
```

You should see a nicely formatted Markdown file!

### Check Raindrop (Cloud)

The knowledge should also be stored in Raindrop Working Memory. You can verify by:

1. Querying again - it should return results from both systems
2. Checking your Raindrop dashboard (if available)

## Step 5: Explore the Code (8 minutes)

### Key Files to Understand

1. **api/knowledge/sync.ts** - Dual-write logic
   - `captureKnowledge()` - Writes to both systems
   - `formatAsMarkdown()` - Converts to Markdown

2. **api/knowledge/retrieval.ts** - Query logic
   - `queryKnowledge()` - Combines graph + semantic search
   - Runs queries in parallel for speed

3. **api/server.ts** - HTTP endpoints
   - Uses Hono (fast Bun-compatible framework)
   - RESTful API for knowledge operations

4. **api/shared/types.ts** - TypeScript types
   - All interfaces and types used across the project

### Architecture Overview

```
Your Custom Tool
      ↓
POST /api/knowledge/capture
      ↓
   sync.ts
   ↓     ↓
basic-memory  Raindrop
   ↓           ↓
Markdown    Cloud Memory
 Files
```

## Next Steps

Now you're ready to:

1. **Build custom tools** (partner's work in `api/tooling/`)
2. **Enhance retrieval** (improve query synthesis)
3. **Add visualization** (graph rendering)
4. **Create UI** (in `interaction/` directory)

## Troubleshooting

### basic-memory not found
```bash
# Install globally
bun add -g @basicmachines/basic-memory
```

### Port 3000 already in use
```bash
# Change port in .env
echo "PORT=3001" >> .env
```

### TypeScript errors
```bash
# Install types
bun add -d @types/bun
```

### MCP connection issues
```bash
# Verify Raindrop MCP is connected
# In Claude Code: /mcp
```

## Demo Prep Checklist

Before demoing your project:

- [ ] Seed knowledge base with 5-10 example entities
- [ ] Test capture workflow end-to-end
- [ ] Test query with natural language questions
- [ ] Show dual persistence (local + cloud)
- [ ] Demonstrate graph connections
- [ ] Show Markdown files are human-readable
- [ ] Demo custom tool integration (partner's work)

## Resources

- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Docs**: See [README.md](./README.md)
- **basic-memory**: https://github.com/basicmachines-co/basic-memory
- **Hono Docs**: https://hono.dev/

Good luck with your hackathon! 🚀
