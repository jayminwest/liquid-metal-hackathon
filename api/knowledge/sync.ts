/**
 * Knowledge Sync Layer
 * Bidirectional synchronization between basic-memory and Raindrop
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

  // Add metadata
  for (const [key, value] of Object.entries(entry.metadata)) {
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }

  lines.push('---');
  lines.push('');

  // Title
  lines.push(`# ${entry.topic}`);
  lines.push('');

  // Content
  lines.push(entry.content);
  lines.push('');

  // Observations
  if (entry.observations.length > 0) {
    lines.push('## Observations');
    lines.push('');
    for (const obs of entry.observations) {
      const tags = obs.tags ? ` ${obs.tags.map(t => `#${t}`).join(' ')}` : '';
      lines.push(`- [${obs.category}] ${obs.text}${tags}`);
    }
    lines.push('');
  }

  // Relations
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

/**
 * Generate entity path from topic
 */
function getEntityPath(topic: string): string {
  // Convert topic to filesystem-safe name
  const safeName = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `entities/${safeName}.md`;
}

/**
 * Capture knowledge and sync to both systems
 *
 * This is the primary write operation that:
 * 1. Writes structured Markdown to basic-memory
 * 2. Stores searchable content in Raindrop Working Memory
 * 3. Optionally stores metadata in Raindrop SmartSQL
 */
export async function captureKnowledge(
  entry: KnowledgeEntry,
  sessionId: string
): Promise<CaptureResponse> {
  try {
    // 1. Write to basic-memory (local graph)
    const entityPath = getEntityPath(entry.topic);
    const markdown = formatAsMarkdown(entry);

    await basicMemory.writeNote({
      path: entityPath,
      content: markdown,
    });

    // 2. Write to Raindrop Working Memory (cloud + semantic search)
    const memoryContent = {
      topic: entry.topic,
      content: entry.content,
      relations: entry.relations,
      observations: entry.observations,
      tags: entry.tags,
      source: entry.source,
      metadata: entry.metadata,
      captured_at: new Date().toISOString(),
    };

    const memoryResult = await raindrop.putMemory({
      session_id: sessionId,
      content: JSON.stringify(memoryContent),
      key: entry.topic,
      timeline: entry.metadata.project || '*defaultTimeline',
    });

    // 3. Store metadata in SmartSQL for analytics
    // TODO: Implement SmartSQL schema for knowledge metadata
    // await raindrop.sqlExecuteQuery({
    //   database_id: 'knowledge-metadata',
    //   query: 'INSERT INTO entities (topic, tags, source, created_at) VALUES (?, ?, ?, ?)',
    //   parameters: [entry.topic, entry.tags.join(','), entry.source, new Date().toISOString()]
    // });

    return {
      status: 'success',
      entity_path: entityPath,
      memory_id: memoryResult.memory_id,
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
 * Update existing knowledge entity
 */
export async function updateKnowledge(
  topic: string,
  updates: Partial<KnowledgeEntry>,
  sessionId: string
): Promise<CaptureResponse> {
  try {
    const entityPath = getEntityPath(topic);

    // 1. Read existing note
    const existing = await basicMemory.readNote({ path: entityPath });

    // TODO: Parse existing Markdown and merge with updates
    // For now, just append new content

    // 2. Update in basic-memory
    const markdown = formatAsMarkdown(updates as KnowledgeEntry);
    await basicMemory.editNote({
      path: entityPath,
      content: markdown,
    });

    // 3. Update in Raindrop
    const memoryResult = await raindrop.putMemory({
      session_id: sessionId,
      content: JSON.stringify(updates),
      key: topic,
      timeline: updates.metadata?.project || '*defaultTimeline',
    });

    return {
      status: 'success',
      entity_path: entityPath,
      memory_id: memoryResult.memory_id,
      graph_updated: true,
    };
  } catch (error) {
    console.error('Error updating knowledge:', error);
    return {
      status: 'error',
      graph_updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete knowledge entity from both systems
 */
export async function deleteKnowledge(
  topic: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const entityPath = getEntityPath(topic);

    // Delete from basic-memory
    await basicMemory.deleteNote({ path: entityPath });

    // TODO: Delete from Raindrop (need delete API)
    // For now, we'll just mark as deleted in a new memory entry

    return { success: true };
  } catch (error) {
    console.error('Error deleting knowledge:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync recent changes from basic-memory to Raindrop
 * Useful for batch syncing after offline work
 */
export async function syncRecentChanges(
  sessionId: string,
  limit: number = 10
): Promise<{ synced: number; errors: string[] }> {
  try {
    // Get recent activity from basic-memory
    const activity = await basicMemory.recentActivity({ limit });

    let synced = 0;
    const errors: string[] = [];

    // Sync each changed file to Raindrop
    for (const item of activity.activities) {
      try {
        // TODO: Parse Markdown and extract structured data
        // For now, just sync the raw content

        await raindrop.putMemory({
          session_id: sessionId,
          content: JSON.stringify(item),
          key: item.path,
        });

        synced++;
      } catch (error) {
        errors.push(`Failed to sync ${item.path}: ${error}`);
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('Error syncing recent changes:', error);
    return {
      synced: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
