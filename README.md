# Liquid Metal Hackathon
## Personalized Knowledge Graph System

A personalized AI knowledge base platform combining **basic-memory** (local knowledge graph) with **Raindrop MCP** (cloud intelligence) for natural language knowledge management.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [basic-memory](https://github.com/basicmachines-co/basic-memory) MCP server
- Raindrop MCP server (already connected ✅)

### Installation

```bash
# Install dependencies
bun install

# Install basic-memory globally
bunx @basicmachines/basic-memory

# Set up environment
cp .env.example .env
# Edit .env with your Raindrop credentials
```

### Development

```bash
# Start the API server
bun run dev

# Run tests
bun test

# Type check
bun run typecheck
```

## Project Structure

```
liquid-metal-hackathon/
├── api/
│   ├── knowledge/          # Knowledge sync & retrieval (YOUR WORK)
│   │   ├── sync.ts         # Bidirectional basic-memory ↔ Raindrop sync
│   │   ├── retrieval.ts    # Natural language retrieval
│   │   └── graph.ts        # Graph operations
│   │
│   ├── shared/             # Shared utilities
│   │   ├── raindrop.ts     # Raindrop MCP client
│   │   ├── basicMemory.ts  # basic-memory MCP client
│   │   └── types.ts        # TypeScript types
│   │
│   └── tooling/            # Custom tool endpoints (PARTNER'S WORK)
│       ├── endpoints.ts    # HTTP endpoints
│       └── registry.ts     # Tool registration
│
├── data/                   # basic-memory local storage
│   ├── entities/           # Knowledge entities (Markdown)
│   └── projects/           # Project organization
│
├── interaction/            # User interface
│
├── PRD.md                  # Product requirements
├── ARCHITECTURE.md         # Architecture documentation
└── README.md               # This file
```

## Architecture

### Hybrid Knowledge System

```
Custom Tools → api/knowledge → basic-memory (local) + Raindrop (cloud)
                                      ↓                    ↓
                                  Markdown Files     Semantic Search
                                  Graph Structure    Working Memory
```

### Why basic-memory + Raindrop?

**Instead of LightRAG:**
- ✅ Both MCP-native (2-4 hour integration vs 20-30 hours)
- ✅ Human-readable Markdown storage
- ✅ Local-first with cloud backup
- ✅ Perfect for hackathon time constraints

**Division of Responsibilities:**
- **basic-memory**: Local graph, fast queries, Markdown files
- **Raindrop**: Semantic search, cloud sync, cross-session memory

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

## API Endpoints

### Knowledge Management

```typescript
POST /api/knowledge/capture
  - Capture new knowledge to both systems

POST /api/knowledge/query
  - Natural language knowledge retrieval

GET /api/knowledge/graph
  - Generate knowledge graph visualization

POST /api/knowledge/sync
  - Sync recent changes
```

### Tool Endpoints (Partner's Work)

```typescript
POST /api/tools/execute
  - Execute custom tools

GET /api/tools/list
  - List available tools
```

## Development Workflow

### Your Work (api/knowledge/)

1. **sync.ts** - Dual-write to basic-memory + Raindrop
2. **retrieval.ts** - Combine graph + semantic search
3. **graph.ts** - Visualization and analytics

### Partner's Work (api/tooling/)

- Custom tool endpoints
- Browser extensions
- CLI tools

## Example Usage

### Capture Knowledge

```typescript
import { captureKnowledge } from './api/knowledge/sync';

await captureKnowledge({
  topic: "LiquidMetal Framework",
  content: "Platform-as-a-Service for AI apps",
  relations: [
    { type: "built_on", target: "Raindrop" }
  ],
  observations: [
    { category: "feature", text: "Actor-based isolation" }
  ],
  tags: ["platform", "ai"],
  source: "documentation",
  metadata: { url: "https://docs.liquidmetal.ai" }
}, sessionId);
```

### Query Knowledge

```typescript
import { queryKnowledge } from './api/knowledge/retrieval';

const result = await queryKnowledge({
  question: "What did I learn about AI platforms?",
  session_id: sessionId,
  mode: "hybrid"
});

console.log(result.answer);
console.log(result.sources);
console.log(result.related);
```

## Next Steps

1. ✅ Clone repo
2. ✅ Read architecture docs
3. [ ] Install basic-memory
4. [ ] Test dual-write to both systems
5. [ ] Build retrieval combining both
6. [ ] Create HTTP endpoints
7. [ ] Integrate with partner's tools
8. [ ] Demo!

## Resources

- [PRD.md](./PRD.md) - Product requirements
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture
- [data/README.md](./data/README.md) - Data directory guide
- [basic-memory docs](https://github.com/basicmachines-co/basic-memory)

## License

MIT