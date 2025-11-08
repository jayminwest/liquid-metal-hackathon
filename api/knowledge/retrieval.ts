/**
 * Knowledge Retrieval Layer
 * Natural language retrieval combining basic-memory graph and Raindrop semantic search
 */

import { basicMemory } from '../shared/basicMemory';
import { raindrop } from '../shared/raindrop';
import type { QueryRequest, QueryResult, Source } from '../shared/types';

/**
 * Query knowledge using natural language
 *
 * This combines:
 * - Graph-based retrieval from basic-memory
 * - Semantic search from Raindrop Working Memory
 * - Optional document search from Raindrop SmartBucket
 */
export async function queryKnowledge(
  request: QueryRequest
): Promise<QueryResult> {
  const { question, session_id, mode = 'hybrid', limit = 10 } = request;

  try {
    // Run queries in parallel for speed
    const [graphResults, semanticResults] = await Promise.all([
      // Graph-based retrieval (basic-memory)
      mode === 'semantic' ? Promise.resolve(null) : queryGraph(question, limit),

      // Semantic retrieval (Raindrop)
      mode === 'graph' ? Promise.resolve(null) : querySemanticMemory(session_id, question, limit),
    ]);

    // Combine and rank results
    const sources = combineAndRankSources(graphResults, semanticResults);

    // Build context from top sources
    const context = await buildContextFromSources(sources.slice(0, 5));

    // Synthesize answer
    const answer = synthesizeAnswer(question, context);

    // Extract related topics
    const related = extractRelatedTopics(sources);

    // Build graph data for visualization (if graph mode)
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
  }));
}

/**
 * Query Raindrop semantic memory
 */
async function querySemanticMemory(sessionId: string, question: string, limit: number) {
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
  }));
}

/**
 * Combine and rank sources from multiple retrieval methods
 */
function combineAndRankSources(
  graphResults: any[] | null,
  semanticResults: any[] | null
): Source[] {
  const sources: Source[] = [];

  if (graphResults) {
    sources.push(...graphResults);
  }

  if (semanticResults) {
    sources.push(...semanticResults);
  }

  // Sort by relevance score
  sources.sort((a, b) => b.relevance - a.relevance);

  // Deduplicate based on content similarity
  // TODO: Implement proper deduplication

  return sources;
}

/**
 * Build context from top sources
 */
async function buildContextFromSources(sources: Source[]): Promise<string> {
  const contextParts: string[] = [];

  for (const source of sources) {
    if (source.type === 'entity' && source.path) {
      // Read full content from basic-memory
      const note = await basicMemory.readNote({ path: source.path });
      contextParts.push(note.content);
    } else if (source.type === 'memory' && source.preview) {
      // Use preview from memory
      contextParts.push(source.preview);
    }
  }

  return contextParts.join('\n\n---\n\n');
}

/**
 * Synthesize answer from context and question
 *
 * TODO: Use an LLM to generate a proper answer
 * For now, just return the context
 */
function synthesizeAnswer(question: string, context: string): string {
  if (!context) {
    return "I couldn't find any relevant information in your knowledge base.";
  }

  // Simple answer synthesis - in production, use LLM
  return `Based on your knowledge base:\n\n${context.substring(0, 500)}...`;
}

/**
 * Extract related topics from sources
 */
function extractRelatedTopics(sources: Source[]): string[] {
  const topics = new Set<string>();

  for (const source of sources) {
    // Extract topics from paths
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
  // Get paths of relevant entities
  const paths = sources
    .filter(s => s.type === 'entity' && s.path)
    .map(s => s.path!);

  if (paths.length === 0) {
    return undefined;
  }

  // Use basic-memory canvas to build graph
  const visualization = await basicMemory.canvas({
    paths,
    type: 'graph',
  });

  // TODO: Parse visualization into structured graph data
  // For now, return placeholder
  return {
    nodes: [],
    edges: [],
  };
}

/**
 * Calculate confidence score based on source quality
 */
function calculateConfidence(sources: Source[]): number {
  if (sources.length === 0) return 0;

  const avgRelevance = sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length;
  const sourceCountFactor = Math.min(sources.length / 5, 1); // More sources = higher confidence

  return avgRelevance * 0.7 + sourceCountFactor * 0.3;
}

/**
 * Find similar entities (related topics)
 */
export async function findRelatedEntities(
  topic: string,
  sessionId: string,
  limit: number = 5
): Promise<string[]> {
  // Search Raindrop for semantically similar memories
  const results = await raindrop.searchMemory({
    session_id: sessionId,
    terms: topic,
    n_most_recent: limit,
  });

  // Extract topics from results
  return results.results
    .map((r: any) => {
      try {
        const data = JSON.parse(r.content);
        return data.topic;
      } catch {
        return null;
      }
    })
    .filter((t: string | null) => t && t !== topic)
    .slice(0, limit);
}

/**
 * Get recent knowledge additions
 */
export async function getRecentKnowledge(limit: number = 10) {
  const activity = await basicMemory.recentActivity({ limit });

  return activity.activities.map((item: any) => ({
    path: item.path,
    timestamp: item.timestamp,
    type: 'entity',
  }));
}
