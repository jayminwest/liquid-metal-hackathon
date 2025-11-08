/**
 * MCP server and tool type definitions
 */

export interface MCPServer {
  userId: string;
  serverCode: string;
  tools: MCPTool[];
  credentialsPath: string;
  metadata: MCPServerMetadata;
}

export interface MCPTool {
  id: string;
  name: string;
  template: string;
  status: 'active' | 'inactive' | 'auth_required';
  oauthComplete: boolean;
  createdAt: string;
}

export interface MCPServerMetadata {
  toolCount: number;
  lastUpdated: string;
  status: 'active' | 'inactive';
}

export interface MCPToolTemplate {
  id: string;
  name: string;
  description: string;
  service: string;
  authType: 'oauth' | 'api-key' | 'none';
  scopes?: string[];
  code: string;
}
