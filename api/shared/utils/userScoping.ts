/**
 * User scoping utilities for Raindrop resources
 * All user data is prefixed with users/{userId}/
 */

/**
 * Get user-scoped key for Raindrop resources
 * @param userId - User identifier
 * @param resource - Resource path (e.g., "mcp-server/server.ts")
 * @returns User-scoped path (e.g., "users/user123/mcp-server/server.ts")
 */
export function getUserKey(userId: string, resource: string): string {
  // Remove leading slash if present
  const cleanResource = resource.startsWith('/') ? resource.slice(1) : resource;
  return `users/${userId}/${cleanResource}`;
}

/**
 * Get MCP server path for user
 * @param userId - User identifier
 * @returns MCP server base path
 */
export function getMCPServerPath(userId: string): string {
  return getUserKey(userId, 'mcp-server');
}

/**
 * Get MCP server code path
 * @param userId - User identifier
 * @returns Full path to server.ts
 */
export function getMCPServerCodePath(userId: string): string {
  return getUserKey(userId, 'mcp-server/server.ts');
}

/**
 * Get MCP credentials path
 * @param userId - User identifier
 * @returns Full path to credentials.json
 */
export function getMCPCredentialsPath(userId: string): string {
  return getUserKey(userId, 'mcp-server/credentials.json');
}

/**
 * Get MCP metadata path
 * @param userId - User identifier
 * @returns Full path to metadata.json
 */
export function getMCPMetadataPath(userId: string): string {
  return getUserKey(userId, 'mcp-server/metadata.json');
}

/**
 * Get tool annotation ID
 * @param userId - User identifier
 * @param toolId - Tool identifier
 * @returns Annotation ID for tool metadata
 */
export function getToolAnnotationId(userId: string, toolId: string): string {
  return getUserKey(userId, `tools/${toolId}`);
}

/**
 * Get MCP server annotation ID
 * @param userId - User identifier
 * @returns Annotation ID for MCP server metadata
 */
export function getMCPServerAnnotationId(userId: string): string {
  return getUserKey(userId, 'mcp-server');
}

/**
 * Get knowledge bucket name for user
 * @param userId - User identifier
 * @returns SmartBucket name
 */
export function getKnowledgeBucketName(userId: string): string {
  return `user-knowledge-${userId}`;
}

/**
 * Get session memory key
 * @param userId - User identifier
 * @param sessionId - Session identifier
 * @returns Memory key for session
 */
export function getSessionMemoryKey(userId: string, sessionId: string): string {
  return getUserKey(userId, `sessions/${sessionId}`);
}

/**
 * Extract userId from user-scoped path
 * @param path - User-scoped path
 * @returns userId or null if not a valid user path
 */
export function extractUserId(path: string): string | null {
  const match = path.match(/^users\/([^/]+)/);
  return match ? match[1] : null;
}
