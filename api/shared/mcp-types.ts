/**
 * Type declarations for Raindrop MCP tools
 * These are available in the Claude Code environment via globalThis
 */

// SmartBucket types
export interface MCPCreateSmartBucketParams {
  bucket_name: string;
  description?: string;
  embedding_model?: string;
}

export interface MCPCreateSmartBucketResult {
  success: boolean;
  bucket_name: string;
}

export interface MCPPutObjectParams {
  bucket_name: string;
  key: string;
  content: string;
  content_type?: string;
}

export interface MCPPutObjectResult {
  success: boolean;
  key: string;
}

export interface MCPGetObjectParams {
  bucket_name: string;
  key: string;
}

export interface MCPGetObjectResult {
  content: string;
  content_type: string;
}

export interface MCPDeleteObjectParams {
  bucket_name: string;
  key: string;
}

export interface MCPDeleteObjectResult {
  success: boolean;
}

export interface MCPListObjectsParams {
  bucket_name: string;
  prefix?: string;
  limit?: number;
}

export interface MCPListObjectsResult {
  objects: Array<{
    key: string;
    size: number;
    last_modified: string;
  }>;
}

// SmartBucket search types
export interface MCPDocumentSearchParams {
  bucket_name: string;
  query: string;
  limit?: number;
  threshold?: number;
}

export interface MCPDocumentSearchResult {
  results: Array<{
    document_id: string;
    score: number;
    content: string;
  }>;
}

export interface MCPChunkSearchParams {
  bucket_name: string;
  query: string;
  document_id?: string;
  limit?: number;
}

export interface MCPChunkSearchResult {
  chunks: Array<{
    chunk_id: string;
    document_id: string;
    content: string;
    score: number;
  }>;
}

export interface MCPDocumentQueryParams {
  bucket_name: string;
  document_id: string;
  query: string;
}

export interface MCPDocumentQueryResult {
  answer: string;
}

// Annotation types
export interface MCPPutAnnotationParams {
  annotation_id: string;
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface MCPPutAnnotationResult {
  success: boolean;
  annotation_id: string;
}

export interface MCPGetAnnotationParams {
  annotation_id: string;
}

export interface MCPGetAnnotationResult {
  content: string;
  metadata: Record<string, any>;
  tags: string[];
}

export interface MCPListAnnotationsParams {
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface MCPListAnnotationsResult {
  annotations: Array<{
    annotation_id: string;
    content: string;
    metadata: Record<string, any>;
    tags: string[];
  }>;
}

// Memory types
export interface MCPPutMemoryParams {
  session_id: string;
  content: string;
  key?: string;
  timeline?: string;
  agent?: string;
}

export interface MCPPutMemoryResult {
  success: boolean;
  memory_id: string;
}

export interface MCPGetMemoryParams {
  session_id: string;
  key?: string;
  timeline?: string;
  n_most_recent?: number;
}

export interface MCPGetMemoryResult {
  memories: Array<{
    memory_id: string;
    content: string;
    timestamp: string;
  }>;
}

export interface MCPSearchMemoryParams {
  session_id: string;
  terms: string;
  timeline?: string;
  n_most_recent?: number;
}

export interface MCPSearchMemoryResult {
  results: Array<{
    memory_id: string;
    content: string;
    relevance: number;
  }>;
}

export interface MCPSummarizeMemoryParams {
  session_id: string;
  timeline?: string;
  n_most_recent?: number;
  system_prompt?: string;
}

export interface MCPSummarizeMemoryResult {
  summary: string;
}

export interface MCPDeleteMemoryParams {
  session_id: string;
  memory_id: string;
}

export interface MCPDeleteMemoryResult {
  success: boolean;
}

// Session types
export interface MCPStartSessionParams {
  // No parameters required
}

export interface MCPStartSessionResult {
  session_id: string;
}

export interface MCPEndSessionParams {
  session_id: string;
  flush?: boolean;
}

export interface MCPEndSessionResult {
  success: boolean;
}

// SQL types
export interface MCPSQLExecuteQueryParams {
  database_id: string;
  query: string;
  parameters?: string[];
}

export interface MCPSQLExecuteQueryResult {
  rows: Array<Record<string, any>>;
}

export interface MCPSQLGetMetadataParams {
  database_id: string;
  table_name?: string;
}

export interface MCPSQLGetMetadataResult {
  metadata: Record<string, any>;
}

// Global MCP tool declarations
declare global {
  var mcp__raindrop_mcp__create_smartbucket: (
    params: MCPCreateSmartBucketParams
  ) => Promise<MCPCreateSmartBucketResult>;

  var mcp__raindrop_mcp__put_object: (
    params: MCPPutObjectParams
  ) => Promise<MCPPutObjectResult>;

  var mcp__raindrop_mcp__get_object: (
    params: MCPGetObjectParams
  ) => Promise<MCPGetObjectResult>;

  var mcp__raindrop_mcp__delete_object: (
    params: MCPDeleteObjectParams
  ) => Promise<MCPDeleteObjectResult>;

  var mcp__raindrop_mcp__list_objects: (
    params: MCPListObjectsParams
  ) => Promise<MCPListObjectsResult>;

  var mcp__raindrop_mcp__document_search: (
    params: MCPDocumentSearchParams
  ) => Promise<MCPDocumentSearchResult>;

  var mcp__raindrop_mcp__chunk_search: (
    params: MCPChunkSearchParams
  ) => Promise<MCPChunkSearchResult>;

  var mcp__raindrop_mcp__document_query: (
    params: MCPDocumentQueryParams
  ) => Promise<MCPDocumentQueryResult>;

  var mcp__raindrop_mcp__put_annotation: (
    params: MCPPutAnnotationParams
  ) => Promise<MCPPutAnnotationResult>;

  var mcp__raindrop_mcp__get_annotation: (
    params: MCPGetAnnotationParams
  ) => Promise<MCPGetAnnotationResult>;

  var mcp__raindrop_mcp__list_annotations: (
    params: MCPListAnnotationsParams
  ) => Promise<MCPListAnnotationsResult>;

  var mcp__raindrop_mcp__put_memory: (
    params: MCPPutMemoryParams
  ) => Promise<MCPPutMemoryResult>;

  var mcp__raindrop_mcp__get_memory: (
    params: MCPGetMemoryParams
  ) => Promise<MCPGetMemoryResult>;

  var mcp__raindrop_mcp__search_memory: (
    params: MCPSearchMemoryParams
  ) => Promise<MCPSearchMemoryResult>;

  var mcp__raindrop_mcp__summarize_memory: (
    params: MCPSummarizeMemoryParams
  ) => Promise<MCPSummarizeMemoryResult>;

  var mcp__raindrop_mcp__delete_memory: (
    params: MCPDeleteMemoryParams
  ) => Promise<MCPDeleteMemoryResult>;

  var mcp__raindrop_mcp__start_session: (
    params: MCPStartSessionParams
  ) => Promise<MCPStartSessionResult>;

  var mcp__raindrop_mcp__end_session: (
    params: MCPEndSessionParams
  ) => Promise<MCPEndSessionResult>;

  var mcp__raindrop_mcp__sql_execute_query: (
    params: MCPSQLExecuteQueryParams
  ) => Promise<MCPSQLExecuteQueryResult>;

  var mcp__raindrop_mcp__sql_get_metadata: (
    params: MCPSQLGetMetadataParams
  ) => Promise<MCPSQLGetMetadataResult>;
}

export {};
