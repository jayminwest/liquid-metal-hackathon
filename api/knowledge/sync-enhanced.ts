/**
 * Enhanced Knowledge Sync Layer
 * Uses ALL Raindrop capabilities:
 * - SmartBucket for document storage
 * - Working Memory for active session
 * - Episodic Memory for past sessions
 * - Semantic Memory for structured knowledge
 * - Procedural Memory for tool templates
 */

import { basicMemory } from '../shared/basicMemory';
import { raindrop } from '../shared/raindrop';
import type { KnowledgeEntry, CaptureResponse } from '../shared/types';

/**
 * Format knowledge entry as Markdown for basic-memory
 */
function formatAsMarkdown(entry: KnowledgeEntry): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`title: ${entry.topic}`);
  lines.push(`tags: [${entry.tags.join(', ')}]`);
  lines.push(`source: ${entry.source}`);
  lines.push(`created: ${new Date().toISOString()}`);

  for (const [key, value] of Object.entries(entry.metadata)) {
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }

  lines.push('---');
  lines.push('');
  lines.push(`# ${entry.topic}`);
  lines.push('');
  lines.push(entry.content);
  lines.push('');

  if (entry.observations.length > 0) {
    lines.push('## Observations');
    lines.push('');
    for (const obs of entry.observations) {
      const tags = obs.tags ? ` ${obs.tags.map(t => `#${t}`).join(' ')}` : '';
      lines.push(`- [${obs.category}] ${obs.text}${tags}`);
    }
    lines.push('');
  }

  if (entry.relations.length > 0) {
    lines.push('## Relations');
    lines.push('');
    for (const rel of entry.relations) {
      lines.push(`- ${rel.type} [[${rel.target}]]`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function getEntityPath(topic: string): string {
  const safeName = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `entities/${safeName}.md`;
}

/**
 * ENHANCED: Capture knowledge to ALL storage layers
 *
 * Storage Strategy:
 * 1. basic-memory (Markdown) - Local graph, fast queries
 * 2. SmartBucket - Semantic document search (RAG)
 * 3. Working Memory - Active session context
 * 4. Semantic Memory - Structured knowledge
 */
export async function captureKnowledge(
  entry: KnowledgeEntry,
  sessionId: string
): Promise<CaptureResponse> {
  try {
    const entityPath = getEntityPath(entry.topic);
    const markdown = formatAsMarkdown(entry);

    // PARALLEL WRITES for performance
    const [
      basicMemoryResult,
      smartBucketResult,
      workingMemoryResult,
      semanticMemoryResult,
    ] = await Promise.all([
      // 1. Write to basic-memory (local graph)
      basicMemory.writeNote({
        path: entityPath,
        content: markdown,
      }),

      // 2. Write to SmartBucket (document storage with RAG)
      raindrop.uploadDocument({
        bucket_name: 'knowledge-base',
        key: `entities/${entry.topic}`,
        content: markdown,
        content_type: 'text/markdown',
      }),

      // 3. Write to Working Memory (active session)
      raindrop.putMemory({
        session_id: sessionId,
        content: JSON.stringify({
          topic: entry.topic,
          content: entry.content,
          relations: entry.relations,
          observations: entry.observations,
          tags: entry.tags,
          source: entry.source,
          metadata: entry.metadata,
          captured_at: new Date().toISOString(),
        }),
        key: entry.topic,
        timeline: entry.metadata.project || '*defaultTimeline',
      }),

      // 4. Write to Semantic Memory (structured knowledge)
      raindrop.putSemanticMemory({
        topic: entry.topic,
        content: entry.content,
        tags: entry.tags,
        metadata: {
          relations: entry.relations,
          observations: entry.observations,
          source: entry.source,
          ...entry.metadata,
        },
      }),
    ]);

    return {
      status: 'success',
      entity_path: entityPath,
      memory_id: workingMemoryResult.memory_id,
      graph_updated: true,
    };
  } catch (error) {
    console.error('Error capturing knowledge:', error);
    return {
      status: 'error',
      graph_updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * End knowledge session and flush to episodic memory
 * Call this when user ends a chat session
 */
export async function endKnowledgeSession(sessionId: string): Promise<{
  summary: string;
  entities_captured: number;
}> {
  try {
    // 1. Generate session summary
    const summary = await raindrop.summarizeMemory({
      session_id: sessionId,
      system_prompt: 'Summarize the key knowledge captured in this session. Focus on main topics, insights, and connections made.',
    });

    // 2. End session and flush to episodic memory
    await raindrop.endSession({
      session_id: sessionId,
      flush: true, // This saves to episodic memory
    });

    // 3. Get count of entities from working memory
    const memories = await raindrop.getMemory({
      session_id: sessionId,
    });

    return {
      summary: summary.summary,
      entities_captured: memories.memories.length,
    };
  } catch (error) {
    console.error('Error ending knowledge session:', error);
    return {
      summary: 'Error generating summary',
      entities_captured: 0,
    };
  }
}

/**
 * Store tool template in procedural memory
 * Use this for saving reusable patterns
 */
export async function saveToolTemplate(params: {
  name: string;
  template: string;
  description: string;
  tags?: string[];
}): Promise<{ success: boolean }> {
  try {
    await raindrop.putProcedure({
      name: params.name,
      template: params.template,
      tags: ['tool-template', ...(params.tags || [])],
      metadata: {
        description: params.description,
        created_at: new Date().toISOString(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving tool template:', error);
    return { success: false };
  }
}

/**
 * Initialize knowledge base
 * Call this once to set up SmartBucket
 */
export async function initializeKnowledgeBase(): Promise<{
  success: boolean;
  bucket_name: string;
}> {
  try {
    const result = await raindrop.createKnowledgeBucket('knowledge-base');

    return {
      success: true,
      bucket_name: result.bucket_name,
    };
  } catch (error) {
    console.error('Error initializing knowledge base:', error);
    return {
      success: false,
      bucket_name: '',
    };
  }
}
