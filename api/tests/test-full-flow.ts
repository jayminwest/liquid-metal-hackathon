/**
 * Full Flow Test - Transferable to Chat Interface
 *
 * This script demonstrates the complete knowledge capture and retrieval flow.
 * The SAME functions can be called from:
 * - Test scripts (this file)
 * - HTTP API endpoints
 * - Chat interface
 * - Custom tools
 */

import {
  captureKnowledge,
  endKnowledgeSession,
  saveToolTemplate,
  initializeKnowledgeBase,
} from '../knowledge/sync-enhanced';
import {
  queryKnowledge,
  searchPastSessions,
} from '../knowledge/retrieval-enhanced';
import type { KnowledgeEntry } from '../shared/types';

/**
 * Test: Initialize knowledge base
 */
async function testInitialization() {
  console.log('\n=== TEST 1: Initialize Knowledge Base ===');

  const result = await initializeKnowledgeBase();
  console.log('✓ Knowledge base created:', result);
}

/**
 * Test: Capture knowledge (simulating chat interaction)
 */
async function testCaptureKnowledge(sessionId: string) {
  console.log('\n=== TEST 2: Capture Knowledge ===');

  const entry: KnowledgeEntry = {
    topic: 'Hybrid Retrieval Strategy',
    content: 'A retrieval approach that combines graph-based search, semantic similarity, and multiple memory layers for comprehensive knowledge access.',
    relations: [
      { type: 'uses', target: 'basic-memory' },
      { type: 'uses', target: 'Raindrop MCP' },
      { type: 'implements', target: 'RAG' },
    ],
    observations: [
      {
        category: 'benefit',
        text: 'Provides more comprehensive results than single-source retrieval',
        tags: ['architecture'],
      },
      {
        category: 'implementation',
        text: 'Runs queries in parallel for optimal performance',
        tags: ['performance'],
      },
      {
        category: 'layers',
        text: 'Combines basic-memory graph, SmartBucket docs, and 4 memory types',
        tags: ['architecture'],
      },
    ],
    tags: ['retrieval', 'architecture', 'rag', 'knowledge-graph'],
    source: 'chat-interaction',
    metadata: {
      project: 'hackathon',
      url: 'https://example.com/hybrid-retrieval',
      importance: 'high',
    },
  };

  const result = await captureKnowledge(entry, sessionId);
  console.log('✓ Knowledge captured:', result);

  // Capture a related entry
  const entry2: KnowledgeEntry = {
    topic: 'RAG Applications',
    content: 'Retrieval Augmented Generation combines LLMs with knowledge retrieval to provide factual, contextual responses.',
    relations: [
      { type: 'related_to', target: 'Hybrid Retrieval Strategy' },
      { type: 'uses', target: 'SmartBucket' },
    ],
    observations: [
      {
        category: 'use_case',
        text: 'Perfect for building AI assistants with access to private knowledge',
      },
      {
        category: 'feature',
        text: 'Grounds LLM responses in actual documents',
      },
    ],
    tags: ['rag', 'ai', 'llm'],
    source: 'chat-interaction',
    metadata: {
      project: 'hackathon',
    },
  };

  const result2 = await captureKnowledge(entry2, sessionId);
  console.log('✓ Related knowledge captured:', result2);
}

/**
 * Test: Query knowledge (simulating user question in chat)
 */
async function testQueryKnowledge(sessionId: string) {
  console.log('\n=== TEST 3: Query Knowledge ===');

  const question = 'How does hybrid retrieval work?';
  console.log(`Question: "${question}"`);

  const result = await queryKnowledge({
    question,
    session_id: sessionId,
    mode: 'hybrid',
  });

  console.log('\n✓ Answer:', result.answer);
  console.log('\n✓ Sources:', result.sources.length, 'sources found');
  console.log('  - Source layers:', new Set(result.sources.map((s: any) => s.source_layer)));
  console.log('\n✓ Related topics:', result.related);
  console.log('\n✓ Confidence:', result.confidence);
}

/**
 * Test: Save tool template (procedural memory)
 */
async function testSaveToolTemplate() {
  console.log('\n=== TEST 4: Save Tool Template ===');

  const result = await saveToolTemplate({
    name: 'slack-integration-template',
    template: `
# Slack MCP Integration Template

## Setup
1. Install Slack MCP server
2. Configure OAuth tokens
3. Add to Claude Code config

## Usage
- Post messages: slack.postMessage()
- Read channels: slack.getChannels()
- Search: slack.search()
    `,
    description: 'Template for integrating Slack via MCP',
    tags: ['mcp', 'integration', 'slack'],
  });

  console.log('✓ Tool template saved:', result);
}

/**
 * Test: End session and create episodic memory
 */
async function testEndSession(sessionId: string) {
  console.log('\n=== TEST 5: End Session (Create Episodic Memory) ===');

  const result = await endKnowledgeSession(sessionId);

  console.log('✓ Session ended');
  console.log('  - Summary:', result.summary);
  console.log('  - Entities captured:', result.entities_captured);
}

/**
 * Test: Search past sessions (episodic memory)
 */
async function testSearchPastSessions() {
  console.log('\n=== TEST 6: Search Past Sessions ===');

  const results = await searchPastSessions('retrieval strategies', 5);

  console.log('✓ Past sessions found:', results.length);
  results.forEach((session, i) => {
    console.log(`  ${i + 1}. ${session.session_date} (relevance: ${session.relevance})`);
    console.log(`     ${session.summary.substring(0, 100)}...`);
  });
}

/**
 * Main test flow - simulates a complete chat session
 */
async function runFullTest() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  FULL FLOW TEST                        ║');
  console.log('║  (Transferable to Chat Interface)      ║');
  console.log('╚════════════════════════════════════════╝');

  const sessionId = `test-session-${Date.now()}`;
  console.log('\nSession ID:', sessionId);

  try {
    await testInitialization();
    await testCaptureKnowledge(sessionId);
    await testQueryKnowledge(sessionId);
    await testSaveToolTemplate();
    await testEndSession(sessionId);

    // Simulate a new session searching past knowledge
    console.log('\n--- Starting New Session ---');
    await testSearchPastSessions();

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\n📝 Key Insights:');
    console.log('  - Knowledge is stored in 5 layers (graph, bucket, working, semantic, episodic)');
    console.log('  - Retrieval searches all layers in parallel');
    console.log('  - Sessions can be ended and searched later');
    console.log('  - Tool templates are preserved in procedural memory');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.main) {
  runFullTest();
}

export { runFullTest };
