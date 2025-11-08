# MCP Server Configuration Guide

This document explains how to set up and use MCP servers with this project.

## Overview

The `.mcp.json` file configures MCP servers that Claude Code can access. This project uses two MCP servers:

1. **Raindrop MCP** - Cloud-based AI infrastructure (SmartBucket, Working Memory, SmartSQL)
2. **basic-memory** - Local-first knowledge graph with Markdown storage

## Quick Setup

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Raindrop Credentials

Edit `.env` and add your Raindrop MCP credentials:

```bash
RAINDROP_ENDPOINT=https://your-raindrop-instance.com
RAINDROP_TOKEN=your_actual_raindrop_token_here
```

**Getting Raindrop Credentials:**
- Sign up at [Raindrop.ai](https://raindrop.ai) (or your Raindrop instance)
- Generate an API token from your dashboard
- Copy the endpoint URL and token to `.env`

### 3. Verify MCP Configuration

The `.mcp.json` file is already configured and will:
- Load environment variables from `.env`
- Connect to Raindrop MCP server
- Connect to basic-memory MCP server (local)

### 4. Restart Claude Code

For Claude Code to pick up the MCP configuration:
1. Save all files
2. Exit Claude Code completely
3. Reopen Claude Code in this project directory
4. MCP servers will auto-connect

## Configuration Details

### `.mcp.json` Structure

```json
{
  "mcpServers": {
    "raindrop-mcp": {
      "command": "npx",
      "args": ["-y", "@raindrop/mcp-server"],
      "env": {
        "RAINDROP_ENDPOINT": "${RAINDROP_ENDPOINT}",
        "RAINDROP_TOKEN": "${RAINDROP_TOKEN}"
      }
    },
    "basic-memory": {
      "command": "npx",
      "args": ["-y", "@basicmachines/basic-memory"],
      "env": {
        "BASIC_MEMORY_DIR": "${BASIC_MEMORY_DIR:-./data}"
      }
    }
  },
  "globalEnvFile": ".env"
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RAINDROP_ENDPOINT` | Raindrop MCP server URL | Yes (for Raindrop) |
| `RAINDROP_TOKEN` | API authentication token | Yes (for Raindrop) |
| `BASIC_MEMORY_DIR` | Local directory for knowledge files | No (defaults to `./data`) |
| `PORT` | API server port | No (defaults to `3000`) |
| `HOST` | API server host | No (defaults to `0.0.0.0`) |

## Verifying MCP Connection

Once Claude Code restarts with the MCP configuration, you can verify the connection:

### Check Available MCP Tools

Ask Claude Code:
```
Can you list the available MCP tools?
```

You should see tools like:
- `mcp__raindrop_mcp__create_smartbucket`
- `mcp__raindrop_mcp__put_memory`
- `mcp__raindrop_mcp__document_search`
- And many more...

### Test MCP Integration

Try creating a session:
```
Can you start a new Raindrop session and store a test memory?
```

Claude Code should be able to call the MCP tools directly.

## Using MCP Tools in Code

The `api/shared/raindrop.ts` file wraps all Raindrop MCP tools:

```typescript
import { RaindropClient } from './api/shared/raindrop';

const client = new RaindropClient({
  endpoint: process.env.RAINDROP_ENDPOINT,
  auth: {
    type: 'bearer',
    token: process.env.RAINDROP_TOKEN
  }
});

// Start a session
const session = await client.startSession();

// Store memory
await client.putMemory({
  session_id: session.session_id,
  content: 'My first memory',
  key: 'user-123'
});
```

## Running the API Server with MCP

The `api/shared/` server is designed to work with MCP tools when running in Claude Code context:

```bash
cd api/shared
bun run --watch index.ts
```

**Important Notes:**
- MCP tools are only available when running **inside Claude Code**
- Standalone Bun server won't have access to `globalThis.mcp__*` functions
- For production deployment, implement HTTP API calls to Raindrop instead

## Troubleshooting

### MCP servers not connecting

1. **Check `.env` file exists and has correct credentials**
   ```bash
   cat .env | grep RAINDROP
   ```

2. **Verify `.mcp.json` syntax**
   ```bash
   cat .mcp.json | jq .
   ```

3. **Check Claude Code logs**
   - View → Output → Select "MCP" from dropdown
   - Look for connection errors

### Tools showing as undefined

If you see `globalThis.mcp__raindrop_mcp__* is not a function`:
- This is **expected** in standalone Bun server
- MCP tools only work in Claude Code runtime context
- Verify you're running commands through Claude Code, not a separate terminal

### Environment variables not loading

1. **Ensure `.env` is in project root**
2. **Check `.mcp.json` has `"globalEnvFile": ".env"`**
3. **Restart Claude Code completely**

## Architecture

```
┌─────────────────────────────────────────────┐
│          Claude Code Runtime                │
│  ┌──────────────────────────────────────┐  │
│  │    Your Code (api/shared/index.ts)   │  │
│  │           ↓                           │  │
│  │    RaindropClient (raindrop.ts)      │  │
│  │           ↓                           │  │
│  │  globalThis.mcp__raindrop_mcp__*     │  │
│  └──────────────────────────────────────┘  │
│                   ↓                         │
│  ┌──────────────────────────────────────┐  │
│  │      MCP Protocol Layer              │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Raindrop MCP Server                 │
│         (npx @raindrop/mcp-server)          │
│                   ↓                         │
│         Raindrop Cloud Service              │
└─────────────────────────────────────────────┘
```

## Additional Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [Claude Code MCP Guide](https://docs.claude.com/claude-code/mcp)
- [Raindrop MCP Documentation](https://docs.raindrop.ai/mcp)
- [basic-memory Documentation](https://github.com/basicmachines-co/basic-memory)

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use environment-specific tokens** - Different tokens for dev/prod
3. **Rotate tokens regularly** - Generate new tokens periodically
4. **Limit token permissions** - Use least-privilege principle
5. **Keep MCP servers updated** - Run `npx` commands to get latest versions
