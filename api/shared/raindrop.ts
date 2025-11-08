/**
 * Raindrop MCP client wrapper
 * Provides a clean interface to Raindrop MCP tools
 *
 * NOTE: In Claude Code context, these calls will be executed via MCP tools.
 * For standalone deployment, implement actual HTTP calls to Raindrop API.
 */

import type { MCPClientConfig } from './types';
import './mcp-types'; // Import type declarations
import {
  validateBucketName,
  validateObjectKey,
  validateSessionId,
  validateAnnotationId,
  validateSQLQuery,
  validateDatabaseId,
  validateContentLength,
  sanitizeError,
} from './validation';
import { localStorage } from './localStorage';

// Runtime check for MCP tools availability
const HAS_MCP_TOOLS = typeof globalThis.mcp__raindrop_mcp__start_session === 'function';

if (!HAS_MCP_TOOLS) {
  console.warn('⚠️  MCP tools not available - using local filesystem fallback');
  console.warn('⚠️  For full functionality, run within Claude Code environment');
}

/**
 * Raindrop MCP Client
 *
 * Wraps all Raindrop capabilities:
 * - SmartBucket: Document storage with semantic search
 * - Working Memory: Active session context
 * - Episodic Memory: Past session summaries
 * - SmartSQL: Structured data storage
 * - Annotations: Structured knowledge storage
 */
export class RaindropClient {
  private config: MCPClientConfig;
  private defaultBucket: string = 'knowledge-base';

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  // ============================================================================
  // SMARTBUCKET - Document Storage with RAG
  // ============================================================================

  /**
   * Convenience method: Create knowledge bucket
   * Alias for createSmartBucket with predefined settings
   */
  async createKnowledgeBucket(bucket_name: string) {
    return this.createSmartBucket({
      bucket_name,
      description: 'Knowledge base storage',
      embedding_model: 'text-embedding-ada-002',
    });
  }

  /**
   * Convenience method: Upload document to bucket
   * Alias for putObject with better semantics for documents
   */
  async uploadDocument(params: {
    bucket_name: string;
    key: string;
    content: string;
    content_type?: string;
  }) {
    return this.putObject(params);
  }

  /**
   * Create SmartBucket for knowledge storage
   */
  async createSmartBucket(params: {
    bucket_name: string;
    description?: string;
    embedding_model?: string;
  }) {
    try {
      validateBucketName(params.bucket_name);

      const result = await globalThis.mcp__raindrop_mcp__create_smartbucket({
        bucket_name: params.bucket_name,
        description: params.description,
        embedding_model: params.embedding_model,
      });
      return { success: true, bucket_name: params.bucket_name };
    } catch (error: any) {
      console.error('[MCP] create-smartbucket error:', error);
      throw sanitizeError(error, 'Failed to create SmartBucket');
    }
  }

  /**
   * Upload document/object to bucket
   */
  async putObject(params: {
    bucket_name: string;
    key: string;
    content: string;
    content_type?: string;
  }) {
    try {
      validateBucketName(params.bucket_name);
      validateObjectKey(params.key);
      validateContentLength(params.content);

      if (HAS_MCP_TOOLS) {
        await globalThis.mcp__raindrop_mcp__put_object({
          bucket_name: params.bucket_name,
          key: params.key,
          content: params.content,
          content_type: params.content_type,
        });
      } else {
        await localStorage.putObject(params.bucket_name, params.key, params.content);
      }
      return { success: true, key: params.key };
    } catch (error: any) {
      console.error('[Storage] put-object error:', error);
      throw sanitizeError(error, 'Failed to put object');
    }
  }

  async getObject(params: {
    bucket_name: string;
    key: string;
  }) {
    try {
      validateBucketName(params.bucket_name);
      validateObjectKey(params.key);

      if (HAS_MCP_TOOLS) {
        const result = await globalThis.mcp__raindrop_mcp__get_object({
          bucket_name: params.bucket_name,
          key: params.key,
        });
        return {
          content: result.content || '',
          content_type: result.content_type || 'application/octet-stream'
        };
      } else {
        const content = await localStorage.getObject(params.bucket_name, params.key);
        return {
          content,
          content_type: 'application/octet-stream'
        };
      }
    } catch (error: any) {
      console.error('[Storage] get-object error:', error);
      throw sanitizeError(error, 'Failed to get object');
    }
  }

  async deleteObject(params: {
    bucket_name: string;
    key: string;
  }) {
    try {
      validateBucketName(params.bucket_name);
      validateObjectKey(params.key);

      await globalThis.mcp__raindrop_mcp__delete_object({
        bucket_name: params.bucket_name,
        key: params.key,
      });
      return { success: true };
    } catch (error: any) {
      console.error('[MCP] delete-object error:', error);
      throw sanitizeError(error, 'Failed to delete object');
    }
  }

  async listObjects(params: {
    bucket_name: string;
    prefix?: string;
    limit?: number;
  }) {
    try {
      validateBucketName(params.bucket_name);

      const result = await globalThis.mcp__raindrop_mcp__list_objects({
        bucket_name: params.bucket_name,
        prefix: params.prefix,
        limit: params.limit,
      });
      return { objects: result.objects || [] };
    } catch (error: any) {
      console.error('[MCP] list-objects error:', error);
      throw sanitizeError(error, 'Failed to list objects');
    }
  }

  /**
   * Search documents semantically in SmartBucket
   */
  async documentSearch(params: {
    bucket_name: string;
    query: string;
    limit?: number;
    threshold?: number;
  }) {
    try {
      validateBucketName(params.bucket_name);

      const result = await globalThis.mcp__raindrop_mcp__document_search({
        bucket_name: params.bucket_name,
        query: params.query,
        limit: params.limit,
        threshold: params.threshold,
      });
      return { results: result.results || [] };
    } catch (error: any) {
      console.error('[MCP] document-search error:', error);
      throw sanitizeError(error, 'Failed to search documents');
    }
  }

  /**
   * Search for specific chunks within documents
   */
  async chunkSearch(params: {
    bucket_name: string;
    query: string;
    document_id?: string;
    limit?: number;
  }) {
    try {
      validateBucketName(params.bucket_name);

      const result = await globalThis.mcp__raindrop_mcp__chunk_search({
        bucket_name: params.bucket_name,
        query: params.query,
        document_id: params.document_id,
        limit: params.limit,
      });
      return { chunks: result.chunks || [] };
    } catch (error: any) {
      console.error('[MCP] chunk-search error:', error);
      throw sanitizeError(error, 'Failed to search chunks');
    }
  }

  /**
   * Ask questions about a specific document
   */
  async documentQuery(params: {
    bucket_name: string;
    document_id: string;
    query: string;
  }) {
    try {
      validateBucketName(params.bucket_name);

      const result = await globalThis.mcp__raindrop_mcp__document_query({
        bucket_name: params.bucket_name,
        document_id: params.document_id,
        query: params.query,
      });
      return { answer: result.answer || '' };
    } catch (error: any) {
      console.error('[MCP] document-query error:', error);
      throw sanitizeError(error, 'Failed to query document');
    }
  }

  // ============================================================================
  // ANNOTATIONS - Structured Knowledge Storage
  // ============================================================================

  async putAnnotation(params: {
    annotation_id: string;
    content: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }) {
    try {
      validateAnnotationId(params.annotation_id);
      validateContentLength(params.content);

      if (HAS_MCP_TOOLS) {
        await globalThis.mcp__raindrop_mcp__put_annotation({
          annotation_id: params.annotation_id,
          content: params.content,
          metadata: params.metadata,
          tags: params.tags,
        });
      } else {
        // Local fallback: store as JSON file
        const annotationPath = `${params.annotation_id}.json`;
        const data = JSON.stringify({
          id: params.annotation_id,
          content: params.content,
          metadata: params.metadata,
          tags: params.tags,
          timestamp: new Date().toISOString(),
        }, null, 2);
        await localStorage.putObject('annotations', annotationPath, data);
      }
      return { success: true, annotation_id: params.annotation_id };
    } catch (error: any) {
      console.error('[Storage] put-annotation error:', error);
      throw sanitizeError(error, 'Failed to put annotation');
    }
  }

  async getAnnotation(params: {
    annotation_id: string;
  }) {
    try {
      validateAnnotationId(params.annotation_id);

      const result = await globalThis.mcp__raindrop_mcp__get_annotation({
        annotation_id: params.annotation_id,
      });
      return {
        content: result.content || '',
        metadata: result.metadata || {},
        tags: result.tags || []
      };
    } catch (error: any) {
      console.error('[MCP] get-annotation error:', error);
      throw sanitizeError(error, 'Failed to get annotation');
    }
  }

  async listAnnotations(params: {
    tags?: string[];
    limit?: number;
    offset?: number;
  }) {
    try {
      const result = await globalThis.mcp__raindrop_mcp__list_annotations({
        tags: params.tags,
        limit: params.limit,
        offset: params.offset,
      });
      return { annotations: result.annotations || [] };
    } catch (error: any) {
      console.error('[MCP] list-annotations error:', error);
      throw sanitizeError(error, 'Failed to list annotations');
    }
  }

  // ============================================================================
  // WORKING MEMORY - Active Session Context
  // ============================================================================

  /**
   * Store memory in active working session
   */
  async putMemory(params: {
    session_id: string;
    content: string;
    key?: string;
    timeline?: string;
    agent?: string;
  }) {
    try {
      validateSessionId(params.session_id);
      validateContentLength(params.content);

      const result = await globalThis.mcp__raindrop_mcp__put_memory({
        session_id: params.session_id,
        content: params.content,
        key: params.key,
        timeline: params.timeline,
        agent: params.agent,
      });
      return { success: true, memory_id: result.memory_id || `mem_${Date.now()}` };
    } catch (error: any) {
      console.error('[MCP] put-memory error:', error);
      throw sanitizeError(error, 'Failed to put memory');
    }
  }

  /**
   * Retrieve memories from working session
   */
  async getMemory(params: {
    session_id: string;
    key?: string;
    timeline?: string;
    n_most_recent?: number;
  }) {
    try {
      validateSessionId(params.session_id);

      const result = await globalThis.mcp__raindrop_mcp__get_memory({
        session_id: params.session_id,
        key: params.key,
        timeline: params.timeline,
        n_most_recent: params.n_most_recent,
      });
      return { memories: result.memories || [] };
    } catch (error: any) {
      console.error('[MCP] get-memory error:', error);
      throw sanitizeError(error, 'Failed to get memory');
    }
  }

  /**
   * Search working memory semantically
   */
  async searchMemory(params: {
    session_id: string;
    terms: string;
    timeline?: string;
    n_most_recent?: number;
  }) {
    try {
      validateSessionId(params.session_id);

      const result = await globalThis.mcp__raindrop_mcp__search_memory({
        session_id: params.session_id,
        terms: params.terms,
        timeline: params.timeline,
        n_most_recent: params.n_most_recent,
      });
      return { results: result.results || [] };
    } catch (error: any) {
      console.error('[MCP] search-memory error:', error);
      throw sanitizeError(error, 'Failed to search memory');
    }
  }

  /**
   * Generate AI summary of working memory
   */
  async summarizeMemory(params: {
    session_id: string;
    timeline?: string;
    n_most_recent?: number;
    system_prompt?: string;
  }) {
    try {
      validateSessionId(params.session_id);

      const result = await globalThis.mcp__raindrop_mcp__summarize_memory({
        session_id: params.session_id,
        timeline: params.timeline,
        n_most_recent: params.n_most_recent,
        system_prompt: params.system_prompt,
      });
      return { summary: result.summary || '' };
    } catch (error: any) {
      console.error('[MCP] summarize-memory error:', error);
      throw sanitizeError(error, 'Failed to summarize memory');
    }
  }

  /**
   * Delete a specific memory entry
   */
  async deleteMemory(params: {
    session_id: string;
    memory_id: string;
  }) {
    try {
      validateSessionId(params.session_id);

      await globalThis.mcp__raindrop_mcp__delete_memory({
        session_id: params.session_id,
        memory_id: params.memory_id,
      });
      return { success: true };
    } catch (error: any) {
      console.error('[MCP] delete-memory error:', error);
      throw sanitizeError(error, 'Failed to delete memory');
    }
  }

  // ============================================================================
  // EPISODIC MEMORY - Past Session Summaries
  // ============================================================================

  /**
   * End session and flush to episodic memory
   * This converts working memory → episodic memory for long-term storage
   */
  async endSession(params: {
    session_id: string;
    flush?: boolean; // If true, saves to episodic memory
  }) {
    try {
      validateSessionId(params.session_id);

      if (HAS_MCP_TOOLS) {
        await globalThis.mcp__raindrop_mcp__end_session({
          session_id: params.session_id,
          flush: params.flush,
        });
      } else {
        // Local fallback: just log session end
        console.log(`[LocalStorage] Session ended: ${params.session_id}, flush: ${params.flush}`);
      }
      return { success: true };
    } catch (error: any) {
      console.error('[Storage] end-session error:', error);
      throw sanitizeError(error, 'Failed to end session');
    }
  }

  /**
   * Search across past sessions (episodic memory)
   * This searches the flushed summaries from previous sessions
   */
  async searchEpisodicMemory(params: {
    query: string;
    n_most_recent?: number;
  }) {
    try {
      // Episodic memory is accessed via annotations with special tags
      const result = await globalThis.mcp__raindrop_mcp__list_annotations({
        tags: ['episodic'],
        limit: params.n_most_recent,
      });
      return { sessions: result.annotations || [] };
    } catch (error: any) {
      console.error('[MCP] search episodic error:', error);
      throw sanitizeError(error, 'Failed to search episodic memory');
    }
  }

  // ============================================================================
  // SEMANTIC MEMORY - Structured Knowledge Documents
  // ============================================================================

  /**
   * Store structured knowledge in semantic memory
   * Alternative to SmartBucket for highly structured data
   */
  async putSemanticMemory(params: {
    topic: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    try {
      validateContentLength(params.content);

      // Use annotations for semantic memory
      const annotation_id = `sem_${params.topic}_${Date.now()}`;
      await globalThis.mcp__raindrop_mcp__put_annotation({
        annotation_id,
        content: params.content,
        tags: ['semantic', ...(params.tags || [])],
        metadata: { topic: params.topic, ...(params.metadata || {}) },
      });
      return { success: true, annotation_id };
    } catch (error: any) {
      console.error('[MCP] put semantic memory error:', error);
      throw sanitizeError(error, 'Failed to put semantic memory');
    }
  }

  /**
   * Search semantic memory
   */
  async searchSemanticMemory(params: {
    query: string;
    tags?: string[];
    limit?: number;
  }) {
    try {
      const result = await globalThis.mcp__raindrop_mcp__list_annotations({
        tags: ['semantic', ...(params.tags || [])],
        limit: params.limit,
      });
      return { results: result.annotations || [] };
    } catch (error: any) {
      console.error('[MCP] search semantic error:', error);
      throw sanitizeError(error, 'Failed to search semantic memory');
    }
  }

  // ============================================================================
  // PROCEDURAL MEMORY - Tool Templates & Patterns
  // ============================================================================

  /**
   * Store tool template or procedural knowledge
   */
  async putProcedure(params: {
    name: string;
    template: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    try {
      validateContentLength(params.template);

      // Use annotations with 'procedure' tag
      const annotation_id = `proc_${params.name}_${Date.now()}`;
      await globalThis.mcp__raindrop_mcp__put_annotation({
        annotation_id,
        content: params.template,
        tags: ['procedure', ...(params.tags || [])],
        metadata: { name: params.name, ...(params.metadata || {}) },
      });
      return { success: true, procedure_id: annotation_id };
    } catch (error: any) {
      console.error('[MCP] put procedure error:', error);
      throw sanitizeError(error, 'Failed to put procedure');
    }
  }

  /**
   * Get specific procedure/template
   */
  async getProcedure(name: string) {
    try {
      const annotation_id = `proc_${name}`;
      const result = await globalThis.mcp__raindrop_mcp__get_annotation({
        annotation_id,
      });
      return { template: result.content || '' };
    } catch (error: any) {
      console.error('[MCP] get procedure error:', error);
      throw sanitizeError(error, 'Failed to get procedure');
    }
  }

  /**
   * List all procedures
   */
  async listProcedures(tags?: string[]) {
    try {
      const result = await globalThis.mcp__raindrop_mcp__list_annotations({
        tags: ['procedure', ...(tags || [])],
      });
      return { procedures: result.annotations || [] };
    } catch (error: any) {
      console.error('[MCP] list procedures error:', error);
      throw sanitizeError(error, 'Failed to list procedures');
    }
  }

  // ============================================================================
  // SMARTSQL - Structured Data Storage
  // ============================================================================

  async sqlExecuteQuery(params: {
    database_id: string;
    query: string;
    parameters?: string[];
  }) {
    try {
      validateDatabaseId(params.database_id);
      validateSQLQuery(params.query);

      const result = await globalThis.mcp__raindrop_mcp__sql_execute_query({
        database_id: params.database_id,
        query: params.query,
        parameters: params.parameters,
      });
      return { rows: result.rows || [] };
    } catch (error: any) {
      console.error('[MCP] sql-execute-query error:', error);
      throw sanitizeError(error, 'Failed to execute SQL query');
    }
  }

  async sqlGetMetadata(params: {
    database_id: string;
    table_name?: string;
  }) {
    try {
      validateDatabaseId(params.database_id);

      const result = await globalThis.mcp__raindrop_mcp__sql_get_metadata({
        database_id: params.database_id,
        table_name: params.table_name,
      });
      return { metadata: result.metadata || {} };
    } catch (error: any) {
      console.error('[MCP] sql-get-metadata error:', error);
      throw sanitizeError(error, 'Failed to get SQL metadata');
    }
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async startSession() {
    try {
      if (HAS_MCP_TOOLS) {
        const result = await globalThis.mcp__raindrop_mcp__start_session({});
        return { session_id: result.session_id || `session_${Date.now()}` };
      } else {
        return await localStorage.startSession();
      }
    } catch (error: any) {
      console.error('[Storage] start-session error:', error);
      throw sanitizeError(error, 'Failed to start session');
    }
  }
}

// Export a singleton instance
export const raindrop = new RaindropClient({
  endpoint: process.env.RAINDROP_ENDPOINT || 'http://localhost:3000',
  auth: {
    type: 'bearer',
    token: process.env.RAINDROP_TOKEN || '',
  },
});
