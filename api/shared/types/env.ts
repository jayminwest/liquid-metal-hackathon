/**
 * Environment bindings interface for Raindrop resources
 */

export interface Env {
  // R2 Bucket bindings (placeholder - Raindrop MCP handles storage)
  USER_MCP_SERVERS?: R2Bucket;
  TOOL_TEMPLATES?: R2Bucket;

  // Raindrop resource names
  USER_KNOWLEDGE?: string;
  AGENT_MEMORY?: string;

  // OAuth credentials for external services
  SLACK_CLIENT_ID?: string;
  SLACK_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  // Raindrop MCP configuration
  RAINDROP_ENDPOINT?: string;
  RAINDROP_TOKEN?: string;
}

// R2Bucket placeholder type (not used in hackathon - using Raindrop MCP instead)
export interface R2Bucket {
  // Placeholder - actual implementation uses Raindrop MCP put-object/get-object
}
