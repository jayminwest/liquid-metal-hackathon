## Chat Interface Integration Guide

How to integrate the knowledge graph system into a production chat interface.

---

## Architecture: Production Chat Flow

```
User Chat Message
       ↓
Chat Interface (UI)
       ↓
Custom Tools (built by user, scaffolded by Claude Code SDK)
       ↓
Knowledge Functions (api/knowledge/sync-enhanced.ts, retrieval-enhanced.ts)
       ↓
   ┌───┴───┐
   ▼       ▼
basic-    Raindrop
memory    (5 layers)
```

### Key Insight

**The test scripts ARE the production code!**

The functions in `test-full-flow.ts` are the EXACT same functions used in production chat:
- `captureKnowledge()` - Called when user shares knowledge in chat
- `queryKnowledge()` - Called when user asks questions
- `endKnowledgeSession()` - Called when chat session ends

---

## Integration Pattern

### 1. Chat Session Lifecycle

```typescript
// chat-session-manager.ts

import { initializeKnowledgeBase } from './api/knowledge/sync-enhanced';
import { raindrop } from './api/shared/raindrop';

class ChatSessionManager {
  private currentSessionId: string | null = null;

  async startChatSession(userId: string): Promise<string> {
    // Start Raindrop session
    const session = await raindrop.startSession();
    this.currentSessionId = session.session_id;

    // Ensure knowledge base exists
    await initializeKnowledgeBase();

    console.log(`Chat session started: ${this.currentSessionId}`);
    return this.currentSessionId;
  }

  async endChatSession(): Promise<void> {
    if (!this.currentSessionId) return;

    // End session and flush to episodic memory
    const summary = await endKnowledgeSession(this.currentSessionId);

    console.log('Session ended:', summary);
    this.currentSessionId = null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}

export const chatSessionManager = new ChatSessionManager();
```

### 2. Handle User Messages

```typescript
// chat-message-handler.ts

import { captureKnowledge } from './api/knowledge/sync-enhanced';
import { queryKnowledge } from './api/knowledge/retrieval-enhanced';
import { chatSessionManager } from './chat-session-manager';

/**
 * Process user message in chat
 */
async function handleUserMessage(message: string, messageType: 'knowledge' | 'question') {
  const sessionId = chatSessionManager.getCurrentSessionId();
  if (!sessionId) {
    throw new Error('No active chat session');
  }

  if (messageType === 'knowledge') {
    // User is sharing knowledge
    return await handleKnowledgeCapture(message, sessionId);
  } else {
    // User is asking a question
    return await handleQuestion(message, sessionId);
  }
}

/**
 * User shares knowledge (detected by custom tools or user intent)
 */
async function handleKnowledgeCapture(message: string, sessionId: string) {
  // Parse message into structured knowledge
  // (This could be done by LLM or custom logic)
  const entry = await parseMessageToKnowledgeEntry(message);

  // Capture to all layers
  const result = await captureKnowledge(entry, sessionId);

  return {
    type: 'knowledge_captured',
    message: `✓ Knowledge captured: "${entry.topic}"`,
    details: result,
  };
}

/**
 * User asks a question
 */
async function handleQuestion(question: string, sessionId: string) {
  // Query all layers
  const result = await queryKnowledge({
    question,
    session_id: sessionId,
    mode: 'hybrid',
  });

  return {
    type: 'answer',
    answer: result.answer,
    sources: result.sources,
    related: result.related,
    confidence: result.confidence,
  };
}

/**
 * Parse natural language message into structured knowledge
 * (Use LLM for this in production)
 */
async function parseMessageToKnowledgeEntry(message: string): Promise<KnowledgeEntry> {
  // TODO: Use LLM to extract:
  // - Topic
  // - Content
  // - Relations
  // - Observations
  // - Tags

  // For now, simple extraction
  return {
    topic: extractTopic(message),
    content: message,
    relations: [],
    observations: extractObservations(message),
    tags: extractTags(message),
    source: 'chat-message',
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
}
```

### 3. Example Chat UI Integration (React)

```typescript
// ChatInterface.tsx

import React, { useState, useEffect } from 'react';
import { chatSessionManager } from './chat-session-manager';
import { handleUserMessage } from './chat-message-handler';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  related?: string[];
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Start session on mount
  useEffect(() => {
    (async () => {
      const id = await chatSessionManager.startChatSession('user-123');
      setSessionId(id);
    })();

    // End session on unmount
    return () => {
      chatSessionManager.endChatSession();
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    // Determine if this is knowledge or question
    // (In production, use LLM or heuristics)
    const messageType = input.startsWith('Remember:') ? 'knowledge' : 'question';

    try {
      // Process message
      const result = await handleUserMessage(
        input.replace('Remember:', '').trim(),
        messageType
      );

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.answer || result.message,
        sources: result.sources,
        related: result.related,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
    }

    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="content">{msg.content}</div>

            {msg.sources && (
              <div className="sources">
                <strong>Sources:</strong>
                {msg.sources.map((s, j) => (
                  <span key={j} className="source">
                    {(s as any).source_layer}
                  </span>
                ))}
              </div>
            )}

            {msg.related && (
              <div className="related">
                <strong>Related:</strong> {msg.related.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask a question or say 'Remember: ...' to capture knowledge"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

---

## Custom Tools Integration

Your partner can build custom tools that call the same functions:

### Browser Extension Example

```typescript
// browser-extension/content-script.ts

import { captureKnowledge } from '../api/knowledge/sync-enhanced';

// Capture selected text as knowledge
async function captureSelection(sessionId: string) {
  const selection = window.getSelection()?.toString();
  if (!selection) return;

  const entry = {
    topic: extractTitleFromPage(),
    content: selection,
    relations: [],
    observations: [
      {
        category: 'source',
        text: `From: ${document.title}`,
      },
    ],
    tags: ['web-clip', 'browser'],
    source: 'browser-extension',
    metadata: {
      url: window.location.href,
      page_title: document.title,
      captured_at: new Date().toISOString(),
    },
  };

  await captureKnowledge(entry, sessionId);

  // Show notification
  showNotification('Knowledge captured!');
}

// Listen for keyboard shortcut
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'k') {
    const sessionId = getCurrentSessionId();
    captureSelection(sessionId);
  }
});
```

### CLI Tool Example

```typescript
// cli/capture.ts

import { captureKnowledge } from '../api/knowledge/sync-enhanced';

async function captureFromCLI(text: string, tags: string[], sessionId: string) {
  const entry = {
    topic: text.split('\n')[0], // First line as topic
    content: text,
    relations: [],
    observations: [],
    tags: ['cli', ...tags],
    source: 'cli-tool',
    metadata: {
      cwd: process.cwd(),
      timestamp: new Date().toISOString(),
    },
  };

  const result = await captureKnowledge(entry, sessionId);
  console.log('✓ Captured:', result.entity_path);
}

// Usage: bun run cli/capture.ts "My knowledge" --tags ai,hackathon
```

---

## Production Deployment Considerations

### Option A: Claude Code as Middleware (Hackathon-Ready)

```
Chat UI → HTTP API → Claude Code (this session) → MCP Tools
                      (has MCP access)
```

**Pros:**
- Works immediately
- No MCP client library needed
- Perfect for demo

**Implementation:**
```typescript
// api/server.ts already set up!
POST /api/knowledge/capture  → calls captureKnowledge()
POST /api/knowledge/query    → calls queryKnowledge()
```

### Option B: Direct MCP Integration (Production)

```
Chat UI → HTTP API → MCP Client Library → MCP Servers
```

**Requires:**
- Installing MCP client SDK
- Implementing HTTP→MCP bridge
- More work, but standalone

---

## Key Features Enabled by This Architecture

### 1. Hybrid Retrieval

Every query searches:
- ✅ basic-memory graph (structured relations)
- ✅ SmartBucket (semantic document search)
- ✅ Working Memory (current session context)
- ✅ Episodic Memory (past session summaries)
- ✅ Semantic Memory (structured knowledge)

### 2. Session Continuity

```typescript
// Session 1: User learns about RAG
await captureKnowledge({ topic: 'RAG Applications', ... }, session1);
await endKnowledgeSession(session1); // Flushes to episodic memory

// Session 2: User asks about RAG (weeks later)
const result = await queryKnowledge({
  question: 'What did I learn about RAG?',
  session_id: session2,
});
// Returns knowledge from episodic memory!
```

### 3. Tool Template Reuse

```typescript
// Save tool template
await saveToolTemplate({
  name: 'slack-integration',
  template: '...',
});

// Later, retrieve for new tool creation
const template = await raindrop.getProcedure('slack-integration');
// Use template to scaffold new integration
```

---

## Testing Before Building UI

Run the test script to verify everything works:

```bash
bun run api/tests/test-full-flow.ts
```

This will:
1. ✅ Initialize knowledge base
2. ✅ Capture knowledge to all layers
3. ✅ Query with hybrid retrieval
4. ✅ Save tool template
5. ✅ End session (create episodic memory)
6. ✅ Search past sessions

Once tests pass, the SAME functions work in your chat UI!

---

## Summary

**The Core Insight:**

Your test scripts ARE your production code. The functions are transferable because they're **pure business logic** - they don't care if they're called from:

- Test scripts
- HTTP endpoints
- Chat interface
- Custom tools (browser, CLI, etc.)

Just pass a `sessionId`, and the system handles:
- Storing to 5 layers in parallel
- Searching all layers
- Managing episodic memory
- Tracking tool templates

**Next Steps:**

1. ✅ Run `bun run api/tests/test-full-flow.ts` to verify
2. Build simple chat UI (React, Vue, whatever)
3. Wire up `handleUserMessage()` to UI input
4. Partner builds custom tools calling same functions
5. Demo the hybrid retrieval showing all 5 layers!

You're ready to build! 🚀
