/**
 * Enhanced Knowledge Retrieval Layer
 * Hybrid retrieval combining ALL sources:
 * - basic-memory graph
 * - SmartBucket documents
 * - Working Memory (active session)
 * - Episodic Memory (past sessions)
 * - Semantic Memory (structured knowledge)
 */

import { basicMemory } from '../shared/basicMemory';
import { raindrop } from '../shared/raindrop';
import type { QueryRequest, QueryResult, Source } from '../shared/types';

/**
 * ENHANCED: Query knowledge using hybrid retrieval
 *
 * Searches 5 sources in parallel:
 * 1. basic-memory graph (local, structured)
 * 2. SmartBucket documents (semantic, RAG)
 * 3. Working Memory (active session context)
 * 4. Episodic Memory (past sessions)
 * 5. Semantic Memory (structured knowledge)
 */
export async function queryKnowledge(
  request: QueryRequest
): Promise<QueryResult> {
  const { question, session_id, mode = 'hybrid', limit = 10 } = request;

  try {
    // Run ALL queries in parallel for speed
    const [
      graphResults,
      bucketResults,
      workingMemoryResults,
      episodicResults,
      semanticResults,
    ] = await Promise.all([
      // 1. Graph-based retrieval (basic-memory)
      mode === 'semantic' ? null : queryGraph(question, limit),

      // 2. Document retrieval (SmartBucket)
      querySmartBucket(question, Math.floor(limit / 2)),

      // 3. Working memory (active session)
      mode === 'graph' ? null : queryWorkingMemory(session_id, question, 5),

      // 4. Episodic memory (past sessions)
      queryEpisodicMemory(question, 3),

      // 5. Semantic memory (structured knowledge)
      querySemanticMemory(question, 5),
    ]);

    // Combine and rank all sources
    const sources = combineAndRankSources({
      graph: graphResults,
      bucket: bucketResults,
      working: workingMemoryResults,
      episodic: episodicResults,
      semantic: semanticResults,
    });

    // Build context from top sources
    const context = await buildContextFromSources(sources.slice(0, 5));

    // Synthesize answer
    const answer = synthesizeAnswer(question, context, sources);

    // Extract related topics
    const related = extractRelatedTopics(sources);

    // Build graph data
    const graph = mode !== 'semantic' ? await buildGraphData(sources) : undefined;

    return {
      answer,
      sources,
      related,
      graph,
      confidence: calculateConfidence(sources),
    };
  } catch (error) {
    console.error('Error querying knowledge:', error);
    return {
      answer: 'Sorry, I encountered an error while searching your knowledge base.',
      sources: [],
      related: [],
      confidence: 0,
    };
  }
}

/**
 * Query basic-memory graph
 */
async function queryGraph(question: string, limit: number) {
  const results = await basicMemory.query({ query: question, limit });

  return results.results.map((result: any) => ({
    type: 'entity' as const,
    path: result.path,
    relevance: result.score || 0.5,
    preview: result.preview,
    source_layer: 'graph',
  }));
}

/**
 * Query SmartBucket for documents
 */
async function querySmartBucket(question: string, limit: number) {
  const results = await raindrop.documentSearch({
    bucket_name: 'knowledge-base',
    query: question,
    limit,
    threshold: 0.7, // Require 70% similarity
  });

  return results.results.map((result: any) => ({
    type: 'document' as const,
    path: result.source,
    relevance: result.score || 0.5,
    preview: result.text?.substring(0, 200),
    source_layer: 'smartbucket',
  }));
}

/**
 * Query Working Memory (active session)
 */
async function queryWorkingMemory(
  sessionId: string,
  question: string,
  limit: number
) {
  const results = await raindrop.searchMemory({
    session_id: sessionId,
    terms: question,
    n_most_recent: limit,
  });

  return results.results.map((result: any) => ({
    type: 'memory' as const,
    id: result.id,
    timestamp: result.timestamp,
    relevance: result.similarity || 0.5,
    preview: result.content?.substring(0, 200),
    source_layer: 'working_memory',
  }));
}

/**
 * Query Episodic Memory (past sessions)
 */
async function queryEpisodicMemory(question: string, limit: number) {
  const results = await raindrop.searchEpisodicMemory({
    query: question,
    n_most_recent: limit,
  });

  return results.sessions.map((session: any) => ({
    type: 'episodic' as const,
    id: session.id,
    timestamp: session.timestamp,
    relevance: session.similarity || 0.4, // Lower default since it's summarized
    preview: session.summary?.substring(0, 200),
    source_layer: 'episodic_memory',
  }));
}

/**
 * Query Semantic Memory (structured knowledge)
 */
async function querySemanticMemory(question: string, limit: number) {
  const results = await raindrop.searchSemanticMemory({
    query: question,
    limit,
  });

  return results.results.map((result: any) => ({
    type: 'semantic' as const,
    id: result.id,
    relevance: result.similarity || 0.5,
    preview: result.content?.substring(0, 200),
    source_layer: 'semantic_memory',
  }));
}

/**
 * Combine and rank sources from all layers
 */
function combineAndRankSources(results: {
  graph: any[] | null;
  bucket: any[] | null;
  working: any[] | null;
  episodic: any[] | null;
  semantic: any[] | null;
}): Source[] {
  const sources: Source[] = [];

  // Weight different sources (graph and bucket get highest weight)
  const weights = {
    graph: 1.0,
    bucket: 1.0,
    working: 0.9,
    semantic: 0.85,
    episodic: 0.7, // Lower weight for summarized past sessions
  };

  for (const [layer, layerResults] of Object.entries(results)) {
    if (layerResults) {
      layerResults.forEach((result: any) => {
        sources.push({
          ...result,
          relevance: result.relevance * weights[layer as keyof typeof weights],
        });
      });
    }
  }

  // Sort by weighted relevance
  sources.sort((a, b) => b.relevance - a.relevance);

  // Deduplicate based on content similarity
  // TODO: Implement proper deduplication

  return sources;
}

/**
 * Build context from top sources across all layers
 */
async function buildContextFromSources(sources: Source[]): Promise<string> {
  const contextParts: string[] = [];

  for (const source of sources) {
    if (source.type === 'entity' && source.path) {
      const note = await basicMemory.readNote({ path: source.path });
      contextParts.push(`[Graph Entity] ${note.content}`);
    } else if (source.type === 'document' && source.path) {
      // Could fetch full document from SmartBucket
      contextParts.push(`[Document] ${source.preview}`);
    } else if (source.preview) {
      const layerLabel = (source as any).source_layer || 'Unknown';
      contextParts.push(`[${layerLabel}] ${source.preview}`);
    }
  }

  return contextParts.join('\n\n---\n\n');
}

/**
 * Synthesize answer from multi-layer context
 */
function synthesizeAnswer(
  question: string,
  context: string,
  sources: Source[]
): string {
  if (!context) {
    return "I couldn't find any relevant information in your knowledge base.";
  }

  // Show which layers contributed
  const layers = new Set(sources.map((s: any) => s.source_layer));
  const layerInfo = `(Sources: ${Array.from(layers).join(', ')})`;

  // In production, use LLM to generate proper answer
  return `Based on your knowledge across ${layers.size} layers:\n\n${context.substring(0, 500)}...\n\n${layerInfo}`;
}

/**
 * Extract related topics from all sources
 */
function extractRelatedTopics(sources: Source[]): string[] {
  const topics = new Set<string>();

  for (const source of sources) {
    if (source.path) {
      const topic = source.path
        .replace('entities/', '')
        .replace('.md', '')
        .replace(/-/g, ' ');
      topics.add(topic);
    }
  }

  return Array.from(topics).slice(0, 5);
}

/**
 * Build graph visualization data
 */
async function buildGraphData(sources: Source[]) {
  const paths = sources
    .filter(s => s.type === 'entity' && s.path)
    .map(s => s.path!);

  if (paths.length === 0) {
    return undefined;
  }

  const visualization = await basicMemory.canvas({
    paths,
    type: 'graph',
  });

  // TODO: Parse visualization into structured graph data
  return {
    nodes: [],
    edges: [],
  };
}

/**
 * Calculate confidence based on multi-layer source quality
 */
function calculateConfidence(sources: Source[]): number {
  if (sources.length === 0) return 0;

  const avgRelevance = sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length;
  const sourceCountFactor = Math.min(sources.length / 5, 1);
  const layerDiversity = new Set(sources.map((s: any) => s.source_layer)).size / 5;

  // Higher confidence when:
  // - High average relevance
  // - Multiple sources
  // - Diverse layers (graph + memory + documents)
  return avgRelevance * 0.5 + sourceCountFactor * 0.3 + layerDiversity * 0.2;
}

/**
 * Search past sessions for context
 */
export async function searchPastSessions(
  query: string,
  limit: number = 5
): Promise<Array<{
  session_date: string;
  summary: string;
  relevance: number;
}>> {
  const results = await raindrop.searchEpisodicMemory({
    query,
    n_most_recent: limit,
  });

  return results.sessions.map((session: any) => ({
    session_date: session.timestamp,
    summary: session.summary,
    relevance: session.similarity || 0,
  }));
}
