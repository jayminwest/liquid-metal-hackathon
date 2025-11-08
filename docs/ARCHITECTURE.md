# Architecture Document
## Personalized Knowledge Graph System

**Version:** 1.0
**Date:** November 8, 2025
**Authors:** Hackathon Team

---

## Executive Summary

This document outlines the technical architecture for our personalized knowledge graph system built on **basic-memory + Raindrop MCP**, chosen for rapid hackathon development and optimal integration with our custom tooling layer.

### Key Architectural Decision

**We chose basic-memory + Raindrop over LightRAG + Raindrop** because:
- Both are MCP-native (no custom adapters needed)
- 2-4 hour integration time vs 20-30+ hours
- basic-memory designed specifically for personal knowledge graphs
- Human-readable Markdown storage (better for demos)
- Low-risk proven patterns

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Custom Tools (Partner's Work)              │
│    (browser extensions, CLI tools, API integrations)    │
└──────────┬─────────────────────────────┬────────────────┘
           │                             │
           ▼                             ▼
   ┌──────────────────┐          ┌──────────────────┐
   │  basic-memory    │◄────────►│    Raindrop      │
   │      (MCP)       │          │      (MCP)       │
   └──────────────────┘          └──────────────────┘

   LOCAL GRAPH                   CLOUD INTELLIGENCE
   • Markdown files              • Working Memory
   • SQLite index                • SmartBucket
   • Graph structure             • SmartSQL
   • Fast queries                • Semantic search
   • WikiLink relations          • Cross-session context
```

---

## Component Responsibilities

### basic-memory (Local Knowledge Graph)

**Purpose:** Primary knowledge graph storage and fast local queries

**Handles:**
- ✅ Markdown-based knowledge storage (`data/` directory)
- ✅ SQLite indexing for fast searches
- ✅ Graph structure via WikiLinks: `[[Entity]]`
- ✅ Observations: `- [category] content #tag`
- ✅ Relations: `- relation_type [[Topic]]`
- ✅ Project organization
- ✅ Visual knowledge graph generation

**Storage Location:** `data/` directory
- Human-readable Markdown files
- Local SQLite database for indexing
- Version controllable (git-friendly)

**MCP Tools Used:**
```javascript
- write_note       // Create/update knowledge entities
- read_note        // Retrieve entity details
- edit_note        // Modify existing notes
- delete_note      // Remove entities
- build_context    // Build context from related entities
- query            // Search knowledge base
- recent_activity  // View recent changes
- canvas           // Generate knowledge visualizations
```

---

### Raindrop (Cloud Intelligence Layer)

**Purpose:** Cloud persistence, semantic search, and cross-session intelligence

**Handles:**
- ✅ Cloud backup of knowledge
- ✅ Semantic similarity search (find forgotten connections)
- ✅ Working Memory (active user context)
- ✅ SmartBucket (long-term document storage)
- ✅ SmartSQL (structured metadata and analytics)
- ✅ Query history and preference learning
- ✅ Cross-device synchronization
- ✅ AI-powered summarization

**MCP Tools Used:**
```javascript
// Working Memory
- put_memory       // Store user context/interactions
- get_memory       // Retrieve session memory
- search_memory    // Semantic search across memories
- summarize_memory // Generate session summaries

// SmartBucket
- document_search  // Semantic document search
- chunk_search     // Fine-grained chunk retrieval
- document_query   // Ask questions about documents

// SmartSQL
- sql_execute_query // Store/query structured data
- sql_get_metadata  // Schema information
```

---

## Directory Structure

```
liquid-metal-hackathon/
├── api/
│   ├── knowledge/          # Knowledge sync layer (YOUR WORK)
│   │   ├── sync.ts         # Bidirectional basic-memory ↔ Raindrop sync
│   │   ├── retrieval.ts    # Natural language retrieval combining both
│   │   └── graph.ts        # Graph operations and traversal
│   │
│   ├── shared/             # Shared utilities
│   │   ├── raindrop.ts     # Raindrop MCP client wrapper
│   │   ├── memory.ts       # Memory management utilities
│   │   └── types.ts        # Shared TypeScript types
│   │
│   └── tooling/            # Custom tool endpoints (PARTNER'S WORK)
│       ├── endpoints.ts    # HTTP endpoints for custom tools
│       └── registry.ts     # Tool registration and execution
│
├── data/                   # basic-memory local storage
│   ├── entities/           # Knowledge entities (Markdown)
│   ├── projects/           # Project-based organization
│   └── .basic-memory/      # SQLite index (auto-generated)
│
├── interaction/            # User interface
│   └── (frontend code)
│
├── PRD.md                  # Product Requirements
├── ARCHITECTURE.md         # This file
└── README.md               # Quick start guide
```

---

## Knowledge Directory Workflow

### api/knowledge/ - Your Focus Area

This directory contains the **knowledge store layer** that bridges basic-memory and Raindrop.

#### 1. **Bidirectional Sync** (`sync.ts`)

**Responsibilities:**
- Write to both basic-memory (Markdown) and Raindrop (Working Memory)
- Keep systems in sync for redundancy and different access patterns
- Handle conflict resolution

**Pattern:**
```typescript
async function captureKnowledge(content: KnowledgeEntry) {
  // 1. Write to basic-memory (local graph)
  await basicMemory.write_note({
    path: `entities/${content.topic}.md`,
    content: formatAsMarkdown(content)
  });

  // 2. Write to Raindrop (cloud + semantic search)
  await raindrop.put_memory({
    session_id: user.session_id,
    content: JSON.stringify(content),
    key: content.topic,
    timeline: content.project || '*defaultTimeline'
  });
}
```

#### 2. **Natural Language Retrieval** (`retrieval.ts`)

**Responsibilities:**
- Query both systems and combine results
- Semantic search via Raindrop
- Graph traversal via basic-memory
- Result ranking and deduplication

**Pattern:**
```typescript
async function queryKnowledge(question: string) {
  // Parallel queries
  const [graphResults, semanticResults] = await Promise.all([
    // Graph-based retrieval (basic-memory)
    basicMemory.query({ query: question }),

    // Semantic retrieval (Raindrop)
    raindrop.search_memory({
      session_id: user.session_id,
      terms: question,
      n_most_recent: 10
    })
  ]);

  // Build context from graph
  const context = await basicMemory.build_context({
    paths: graphResults
  });

  // Combine and synthesize
  return synthesizeResults(context, semanticResults);
}
```

#### 3. **Graph Operations** (`graph.ts`)

**Responsibilities:**
- Graph visualization
- Relationship extraction
- Knowledge evolution tracking
- Pattern detection

---

## Integration Patterns

### Pattern 1: Capture Knowledge from Custom Tools

```typescript
// Your partner's custom tool calls this
POST /api/knowledge/capture

{
  "topic": "LiquidMetal Framework",
  "content": "Platform-as-a-Service for AI-native applications",
  "relations": [
    { "type": "built_on", "target": "Raindrop" },
    { "type": "provides", "target": "SmartBucket" }
  ],
  "observations": [
    { "category": "feature", "text": "Actor-based isolation" },
    { "category": "use_case", "text": "Hackathon projects" }
  ],
  "tags": ["platform", "ai", "paas"],
  "source": "browser-extension",
  "metadata": {
    "url": "https://docs.liquidmetal.ai",
    "captured_at": "2025-11-08T12:00:00Z"
  }
}

Response:
{
  "status": "success",
  "entity_path": "data/entities/liquidmetal-framework.md",
  "memory_id": "mem_xyz123",
  "graph_updated": true
}
```

### Pattern 2: Natural Language Retrieval

```typescript
// User asks question via chat interface
POST /api/knowledge/query

{
  "question": "What did I learn about AI platforms this week?",
  "session_id": "user_session_abc",
  "mode": "hybrid"  // 'graph' | 'semantic' | 'hybrid'
}

Response:
{
  "answer": "You learned about LiquidMetal Framework...",
  "sources": [
    {
      "type": "entity",
      "path": "data/entities/liquidmetal-framework.md",
      "relevance": 0.95
    },
    {
      "type": "memory",
      "id": "mem_xyz123",
      "timestamp": "2025-11-08T12:00:00Z",
      "relevance": 0.87
    }
  ],
  "related": [
    "Raindrop MCP",
    "basic-memory",
    "SmartBucket"
  ],
  "graph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

### Pattern 3: Knowledge Evolution Tracking

```typescript
// Periodic summarization
POST /api/knowledge/summarize

{
  "session_id": "user_session_abc",
  "period": "week",
  "timeline": "*defaultTimeline"
}

Response:
{
  "summary": "This week you explored...",
  "new_entities": 12,
  "new_relations": 23,
  "trending_topics": ["AI platforms", "MCP servers", "Knowledge graphs"],
  "suggested_connections": [
    {
      "source": "LiquidMetal",
      "relation": "similar_to",
      "target": "Vercel",
      "confidence": 0.75
    }
  ]
}
```

---

## Data Flow

### Write Flow

```
Custom Tool
    │
    ▼
POST /api/knowledge/capture
    │
    ├──────────────────┬──────────────────┐
    ▼                  ▼                  ▼
write_note        put_memory      sql_execute_query
(basic-memory)    (Raindrop)      (Raindrop SmartSQL)
    │                  │                  │
    ▼                  ▼                  ▼
Markdown File    Working Memory    Metadata Table
(data/)          (Cloud)           (Analytics)
```

### Read Flow

```
User Question
    │
    ▼
POST /api/knowledge/query
    │
    ├──────────────────┬──────────────────┐
    ▼                  ▼                  ▼
query             search_memory    chunk_search
(basic-memory)    (Raindrop)       (Raindrop)
    │                  │                  │
    ▼                  ▼                  ▼
Graph Results    Semantic Results  Document Chunks
    │                  │                  │
    └──────────────────┴──────────────────┘
                       │
                       ▼
              Synthesize & Rank
                       │
                       ▼
              Natural Language Answer
```

---

## Knowledge Evolution

### How the System Learns and Adapts

1. **Graph Growth** (basic-memory)
   - New entities create Markdown files
   - Relations automatically expand graph
   - WikiLinks create bidirectional connections

2. **Semantic Patterns** (Raindrop)
   - Working Memory tracks what user focuses on
   - Semantic search reveals forgotten connections
   - Summarization identifies trends

3. **Timeline Tracking** (Raindrop)
   - Different contexts: work, personal, projects
   - Timeline-based memory retrieval
   - Context switching support

4. **Analytics** (Raindrop SmartSQL)
   - Query patterns
   - Entity creation frequency
   - Relationship types distribution
   - Knowledge base growth metrics

---

## Technology Stack

### Required Components

**basic-memory:**
- Installation: `npx @basicmachines/basic-memory`
- Storage: Local filesystem + SQLite
- Protocol: MCP (Model Context Protocol)

**Raindrop MCP:**
- Already connected ✅
- Cloud-hosted
- Protocol: MCP

**Runtime:**
- Node.js / Bun
- TypeScript
- Express.js (or similar for HTTP endpoints)

---

## Development Workflow

### Your Work (api/knowledge/)

1. **sync.ts** - Start here
   - Implement `captureKnowledge()`
   - Implement `updateKnowledge()`
   - Handle dual writes to both systems

2. **retrieval.ts** - Core feature
   - Implement `queryKnowledge()`
   - Combine graph + semantic results
   - Rank and deduplicate

3. **graph.ts** - Nice to have
   - Graph visualization
   - Relationship extraction
   - Analytics integration

### Partner's Work (api/tooling/)

- Custom tool endpoints
- Browser extensions
- CLI tools
- Integration scripts

### Integration Points

```typescript
// Shared types (api/shared/types.ts)
interface KnowledgeEntry {
  topic: string;
  content: string;
  relations: Array<{
    type: string;
    target: string;
  }>;
  observations: Array<{
    category: string;
    text: string;
  }>;
  tags: string[];
  source: string;
  metadata: Record<string, any>;
}

// Your partner calls your API
import { captureKnowledge } from '../knowledge/sync';

// You both use shared Raindrop client
import { raindrop } from '../shared/raindrop';
```

---

## Why This Architecture Works for Hackathons

### Time Efficiency
- ✅ **2-4 hours to MVP** (vs 20-30 with LightRAG)
- ✅ No custom storage adapters needed
- ✅ Both systems MCP-native (direct tool calls)

### Demo Appeal
- ✅ **Human-readable Markdown files** - "Look, I can edit my knowledge graph in VSCode!"
- ✅ Visual graph generation via basic-memory canvas
- ✅ Real-time sync visible to audience

### Flexibility
- ✅ Local-first (works offline)
- ✅ Cloud-backed (sync across devices)
- ✅ Version controllable (git-friendly)
- ✅ Easy to inspect and debug

### Future-Proof
- ✅ Can migrate to LightRAG later if needed
- ✅ MCP protocol is standard
- ✅ Raindrop scales with usage
- ✅ basic-memory has export capabilities

---

## Success Metrics (Hackathon)

**Must Achieve:**
- [ ] Capture knowledge from custom tool → visible in both systems
- [ ] Natural language query → returns relevant results
- [ ] Graph visualization → shows entity relationships
- [ ] Dual persistence → survives service restarts

**Nice to Have:**
- [ ] Cross-session memory → "What did I learn yesterday?"
- [ ] Semantic discovery → "Find related topics I forgot about"
- [ ] Knowledge summarization → "Summarize my week"
- [ ] Timeline support → Different contexts (work/personal)

---

## Open Questions

1. **Conflict Resolution:** What if basic-memory and Raindrop diverge?
2. **Sync Frequency:** Real-time or batched?
3. **Storage Limits:** How much to store locally vs cloud?
4. **Privacy:** Which data stays local vs syncs to cloud?
5. **Graph Complexity:** Max entities/relations before performance degrades?

---

## Next Steps

### Immediate (Next 2 Hours)
1. [ ] Install basic-memory: `npx @basicmachines/basic-memory`
2. [ ] Verify Raindrop MCP connection
3. [ ] Create `api/knowledge/sync.ts` skeleton
4. [ ] Test dual-write pattern with simple entity
5. [ ] Verify Markdown file creation in `data/`

### Short-term (Next 4-6 Hours)
1. [ ] Implement full capture workflow
2. [ ] Build retrieval combining both systems
3. [ ] Create HTTP endpoints
4. [ ] Integrate with partner's custom tools
5. [ ] Demo end-to-end workflow

### Demo Prep
1. [ ] Seed knowledge base with example entities
2. [ ] Prepare demo questions
3. [ ] Show dual persistence (local + cloud)
4. [ ] Visualize knowledge graph
5. [ ] Demonstrate natural language retrieval

---

## References

- [basic-memory GitHub](https://github.com/basicmachines-co/basic-memory)
- [Raindrop MCP Documentation](https://docs.liquidmetal.ai)
- [PRD.md](./PRD.md) - Full product requirements
- [README.md](./README.md) - Quick start guide

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | Hackathon Team | Initial architecture design |

**Status:** ✅ Ready to implement
