/**
 * Shared TypeScript types for the knowledge graph system
 */

// Core knowledge entity structure
export interface KnowledgeEntry {
  topic: string;
  content: string;
  relations: Relation[];
  observations: Observation[];
  tags: string[];
  source: string;
  metadata: Record<string, any>;
}

// Relation between entities
export interface Relation {
  type: string;      // e.g., "built_on", "related_to", "part_of"
  target: string;    // Target entity name
  metadata?: Record<string, any>;
}

// Observation about an entity
export interface Observation {
  category: string;  // e.g., "fact", "feature", "use_case"
  text: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Query request
export interface QueryRequest {
  question: string;
  session_id: string;
  mode?: 'graph' | 'semantic' | 'hybrid';
  limit?: number;
  timeline?: string;
}

// Query result
export interface QueryResult {
  answer: string;
  sources: Source[];
  related: string[];
  graph?: GraphData;
  confidence?: number;
}

// Source attribution
export interface Source {
  type: 'entity' | 'memory' | 'document';
  path?: string;
  id?: string;
  timestamp?: string;
  relevance: number;
  preview?: string;
}

// Graph visualization data
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  metadata?: Record<string, any>;
}

// Capture response
export interface CaptureResponse {
  status: 'success' | 'error';
  entity_path?: string;
  memory_id?: string;
  graph_updated: boolean;
  error?: string;
}

// Summarization request
export interface SummarizeRequest {
  session_id: string;
  period?: 'day' | 'week' | 'month' | 'all';
  timeline?: string;
  n_most_recent?: number;
}

// Summarization response
export interface SummarizeResponse {
  summary: string;
  new_entities: number;
  new_relations: number;
  trending_topics: string[];
  suggested_connections: SuggestedConnection[];
  period: {
    start: string;
    end: string;
  };
}

export interface SuggestedConnection {
  source: string;
  relation: string;
  target: string;
  confidence: number;
  reason?: string;
}

// MCP client configuration
export interface MCPClientConfig {
  endpoint: string;
  auth?: {
    type: 'bearer' | 'api-key';
    token: string;
  };
  timeout?: number;
}

// User session
export interface UserSession {
  session_id: string;
  user_id: string;
  created_at: string;
  last_active: string;
  timeline: string;
  metadata?: Record<string, any>;
}

// Re-export types from new type modules
export * from './types/env';
export * from './types/context';
export * from './types/api';
export * from './types/mcp';
