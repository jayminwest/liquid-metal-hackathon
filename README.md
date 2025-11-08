# Liquid Metal Hackathon
## Personalized Knowledge Graph System

A personalized AI knowledge base platform combining **basic-memory** (local knowledge graph) with **Raindrop MCP** (cloud intelligence) for natural language knowledge management.

### What's Working Now ✅

- **Hybrid Retrieval:** Graph-based (WikiLinks) + Keyword (FTS5) + Semantic (vector embeddings)
- **Raindrop Cloud:** Working Memory, Semantic Search, AI Summarization functional
- **HTTP API:** Full REST API with 8+ endpoints (capture, query, upload, chat, etc.)
- **Session Management:** Multi-user support via session IDs
- **File Upload:** Markdown and text file ingestion
- **Chat Interface:** Natural language queries against your knowledge base

See [TEST_RESULTS.md](./TEST_RESULTS.md) for proof-of-concept validation.

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
# Start both API and UI (recommended)
bun run dev

# Or run separately:
bun run dev:api    # API server only (port 3000)
bun run dev:ui     # Frontend only (Vite dev server)

# Run tests
bun test

# Type check
bun run typecheck  # Checks both API and UI

# Build for production
bun run build
```

**Note:** API runs on port 3000, serves both API endpoints and built frontend.

## Tech Stack

- **Runtime:** Bun (fast JavaScript/TypeScript runtime)
- **API Framework:** Hono (lightweight, fast HTTP framework)
- **Frontend:** React + TypeScript + Vite
- **Storage:**
  - basic-memory (local SQLite + Markdown files)
  - Raindrop MCP (cloud Working Memory, SmartBucket, SmartSQL)
- **Protocol:** MCP (Model Context Protocol) for AI integration

## Project Structure

```
liquid-metal-hackathon/
├── api/
│   ├── server.ts           # Main API server (Hono)
│   ├── knowledge/          # Knowledge sync & retrieval
│   │   ├── sync.ts         # Bidirectional basic-memory ↔ Raindrop sync
│   │   ├── retrieval.ts    # Natural language hybrid retrieval
│   │   └── graph.ts        # Graph operations
│   │
│   ├── shared/             # Shared utilities
│   │   ├── raindrop.ts     # Raindrop MCP client (placeholder)
│   │   ├── basicMemory.ts  # basic-memory MCP client (placeholder)
│   │   ├── types/          # TypeScript type definitions
│   │   ├── services/       # Service layer (SmartBucket, SmartMemory, etc.)
│   │   ├── middleware/     # Express-style middleware
│   │   └── utils/          # Helper functions
│   │
│   └── tests/              # Integration tests
│
├── data/                   # basic-memory local storage
│   ├── entities/           # Knowledge entities (Markdown)
│   └── projects/           # Project organization
│
├── interaction/            # React frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── hooks/         # React hooks (useChat, etc.)
│   │   └── types.ts       # Frontend types
│   └── dist/              # Built frontend (served by API)
│
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md    # System architecture
│   ├── PRD.md             # Product requirements
│   └── GETTING_STARTED.md # Setup guide
│
├── TEST_RESULTS.md         # Test results & proof of concept
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

## How basic-memory & Raindrop Work Together

### Dual-Write Pattern

When you capture knowledge, it's written to **both systems simultaneously**:

```typescript
// 1. Write to basic-memory (local graph) - sync.ts:93-96
await basicMemory.writeNote({
  path: 'entities/liquidmetal-framework.md',
  content: markdown  // Human-readable Markdown
});

// 2. Write to Raindrop (cloud + semantic) - sync.ts:110-115
await raindrop.putMemory({
  session_id: sessionId,
  content: JSON.stringify(memoryContent),  // JSON for semantic search
  key: entry.topic
});
```

This creates **two representations of the same knowledge**:

**basic-memory** stores:
```markdown
# LiquidMetal Framework
Platform-as-a-Service for AI apps

## Relations
- built_on [[Raindrop]]
- provides [[SmartBucket]]
```

**Raindrop** stores:
```json
{
  "topic": "LiquidMetal Framework",
  "content": "Platform-as-a-Service for AI apps",
  "relations": [{"type": "built_on", "target": "Raindrop"}]
}
```

### What Each System Does

#### basic-memory: Graph + Keyword Search

1. **WikiLinks** (`[[Entity Name]]`): Creates bidirectional graph edges
   - `- built_on [[Raindrop]]` creates a relation in SQLite
   - Enables graph traversal queries

2. **SQLite FTS5**: Full-text keyword search
   - ✅ Keyword matching with stemming ("running" matches "run")
   - ✅ Prefix search ("rain" matches "raindrop")
   - ✅ BM25 ranking (TF-IDF style relevance)
   - ❌ NOT semantic - "car" won't match "automobile"
   - ❌ No vector embeddings

3. **Fast Local Access**: Immediate read/write, works offline

#### Raindrop: Semantic Search + Cloud Intelligence

1. **Vector Embeddings**: Semantic similarity search
   - ✅ Conceptual matching - "PaaS" matches "cloud hosting"
   - ✅ Finds related ideas even with different words
   - ✅ Cross-session memory patterns

2. **Working Memory**: Temporal context tracking
   - Recent activity awareness
   - Timeline-based retrieval
   - Session continuity

3. **Cloud Sync**: Cross-device, always available

### Hybrid Retrieval: The Power of Both

When you query with `mode: "hybrid"` (retrieval.ts:24-31):

```typescript
// Run BOTH queries in parallel
const [graphResults, semanticResults] = await Promise.all([
  queryGraph(question, limit),           // Graph + keyword
  querySemanticMemory(session_id, question, limit)  // Semantic
]);

// Combine and rank results
const sources = combineAndRankSources(graphResults, semanticResults);
```

#### Example: "What PaaS platforms do I know?"

**basic-memory (FTS5 keyword search):**
- Searches for keywords: "paas", "platform"
- ✅ Finds: "LiquidMetal is a PaaS platform"
- ❌ Misses: "Vercel is a cloud hosting service" (no keyword match)

**Raindrop (semantic search):**
- Understands concepts via embeddings
- ✅ Finds: "LiquidMetal is a PaaS platform"
- ✅ Also finds: "Vercel is a cloud hosting service" (semantically similar)

**Combined (hybrid):**
- Gets both keyword matches AND semantic matches
- Ranks by combined relevance scores
- More comprehensive, accurate results!

### Benefits of This Architecture

1. **Complementary Strengths**
   - Graph structure (WikiLinks) + Keywords (FTS5) + Semantics (vectors)
   - Each catches what the others might miss

2. **Performance**
   - Parallel queries (retrieval.ts:24-31) - both run simultaneously
   - Fast results from both systems at once

3. **Reliability**
   - Redundancy - if one system fails, the other still works
   - Higher confidence when both systems agree (retrieval.ts:210-217)

4. **Offline + Online**
   - basic-memory works offline (local SQLite)
   - Raindrop provides cloud backup and cross-device sync
   - `syncRecentChanges()` reconciles after offline work

5. **Human-Readable Storage**
   - Markdown files in `data/entities/` are editable in any text editor
   - Version controllable with git
   - Easy to inspect and debug

### Data Flow Visualization

```
User Query: "What did I learn about AI platforms?"
                    ↓
            queryKnowledge()
                    ↓
        ┌───────────┴───────────┐
        ▼                       ▼
  queryGraph()          querySemanticMemory()
  (basic-memory)              (Raindrop)
        │                       │
        ↓                       ↓
  Graph + Keyword          Vector Search
    WikiLinks              Embeddings
    FTS5 Index             Similarity
        │                       │
        └───────────┬───────────┘
                    ↓
          combineAndRankSources()
                    ↓
            Unified Results
        (sorted by relevance)
```

## API Endpoints

All endpoints support `X-Session-ID` header for user session management (defaults to `default-session`).

### Knowledge Management (`/api/knowledge`)

```typescript
POST   /capture              # Capture new knowledge to both systems
POST   /query                # Natural language hybrid retrieval
POST   /upload               # Upload files (Markdown, text, etc.)
POST   /sync                 # Sync recent changes from basic-memory to Raindrop
GET    /graph                # Generate knowledge graph visualization
GET    /suggestions          # Get AI-suggested connections
GET    /recent               # Get recent knowledge entries
GET    /related/:topic       # Find related entities
```

### Chat Interface

```typescript
POST   /api/chat             # Chat with your knowledge base
       Body: { message: string }
       Returns: AI-generated response based on hybrid retrieval
```

### Health Check

```typescript
GET    /health               # Service health status
```

### Tool Endpoints (Placeholder)

```typescript
GET    /api/tooling          # Partner's custom tool endpoints (TBD)
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

## Implementation Status

### Completed ✅

1. ✅ Architecture designed (dual-write, hybrid retrieval)
2. ✅ Raindrop integration working (Working Memory, Semantic Search, AI Summarization)
3. ✅ HTTP API server with Hono
4. ✅ All knowledge endpoints implemented
5. ✅ Chat endpoint functional
6. ✅ File upload support
7. ✅ Frontend scaffolding (React + Vite)
8. ✅ Session management
9. ✅ Hybrid retrieval logic (graph + semantic)

### In Progress 🚧

1. 🚧 basic-memory MCP integration (client wrapper ready, needs setup)
2. 🚧 Frontend UI implementation
3. 🚧 SmartBucket authentication for document storage

### Next Steps

1. Install basic-memory: `bunx @basicmachines/basic-memory`
2. Connect frontend to API endpoints
3. Add SmartBucket credentials for document storage
4. Build graph visualization component
5. Add unit tests
6. Partner: Custom tool endpoints

See [TEST_RESULTS.md](./TEST_RESULTS.md) for detailed test results.

## Quick Reference

### Starting the System

```bash
# 1. Start the full stack
bun run dev

# 2. Access the API
curl http://localhost:3000/health

# 3. Capture knowledge
curl -X POST http://localhost:3000/api/knowledge/capture \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: my-session" \
  -d '{
    "topic": "Test Entry",
    "content": "This is a test",
    "relations": [],
    "observations": [],
    "tags": ["test"],
    "source": "api",
    "metadata": {}
  }'

# 4. Query knowledge
curl -X POST http://localhost:3000/api/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What did I learn?",
    "session_id": "my-session",
    "mode": "hybrid"
  }'
```

### Session Management

Use the `X-Session-ID` header to isolate knowledge by user/session:
- Raindrop Working Memory is scoped per session
- basic-memory stores all sessions in shared graph
- Sessions enable multi-user support and context isolation

## Resources

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Detailed system architecture
- [docs/PRD.md](./docs/PRD.md) - Product requirements document
- [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md) - Detailed setup guide
- [TEST_RESULTS.md](./TEST_RESULTS.md) - Proof of concept test results
- [data/README.md](./data/README.md) - Data directory guide
- [basic-memory docs](https://github.com/basicmachines-co/basic-memory) - Local knowledge graph
- [Raindrop docs](https://docs.liquidmetal.ai) - Cloud MCP server

## License

MIT