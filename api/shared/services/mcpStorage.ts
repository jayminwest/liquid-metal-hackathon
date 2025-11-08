/**
 * MCP Storage service
 * Manages storing and retrieving user MCP servers and credentials
 */

import { RaindropClient } from '../raindrop';
import type { MCPClientConfig, MCPServer } from '../types';
import {
  getMCPServerCodePath,
  getMCPCredentialsPath,
  getMCPMetadataPath,
  getUserKey,
} from '../utils/userScoping';
import { isValidUserId } from '../utils/validation';

export class MCPStorageService {
  private raindrop: RaindropClient;
  private bucketName: string;

  constructor(config: MCPClientConfig, bucketName: string = 'user-mcp-servers') {
    this.raindrop = new RaindropClient(config);
    this.bucketName = bucketName;
  }

  /**
   * Store MCP server code
   */
  async storeServerCode(userId: string, serverCode: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const key = getMCPServerCodePath(userId);

    return this.raindrop.putObject({
      bucket_name: this.bucketName,
      key,
      content: serverCode,
      content_type: 'text/typescript',
    });
  }

  /**
   * Retrieve MCP server code
   */
  async getServerCode(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const key = getMCPServerCodePath(userId);

    const result = await this.raindrop.getObject({
      bucket_name: this.bucketName,
      key,
    });

    return result.content;
  }

  /**
   * Store credentials (OAuth tokens, API keys)
   * WARNING: In hackathon, storing as plaintext. Production should encrypt!
   */
  async storeCredentials(userId: string, credentials: Record<string, any>) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const key = getMCPCredentialsPath(userId);
    const content = JSON.stringify(credentials, null, 2);

    return this.raindrop.putObject({
      bucket_name: this.bucketName,
      key,
      content,
      content_type: 'application/json',
    });
  }

  /**
   * Retrieve credentials
   */
  async getCredentials(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const key = getMCPCredentialsPath(userId);

    const result = await this.raindrop.getObject({
      bucket_name: this.bucketName,
      key,
    });

    if (result.content) {
      return JSON.parse(result.content);
    }

    return null;
  }

  /**
   * Store MCP server metadata
   */
  async storeMetadata(userId: string, metadata: {
    toolCount: number;
    lastUpdated: string;
    status: 'active' | 'inactive';
    tools: Array<{
      id: string;
      name: string;
      template: string;
    }>;
    [key: string]: any;
  }) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const key = getMCPMetadataPath(userId);
    const content = JSON.stringify(metadata, null, 2);

    return this.raindrop.putObject({
      bucket_name: this.bucketName,
      key,
      content,
      content_type: 'application/json',
    });
  }

  /**
   * Retrieve MCP server metadata
   */
  async getMetadata(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const key = getMCPMetadataPath(userId);

    const result = await this.raindrop.getObject({
      bucket_name: this.bucketName,
      key,
    });

    if (result.content) {
      return JSON.parse(result.content);
    }

    return null;
  }

  /**
   * Delete MCP server (all files)
   */
  async deleteServer(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    // Delete all server files
    const deletePromises = [
      this.raindrop.deleteObject({
        bucket_name: this.bucketName,
        key: getMCPServerCodePath(userId),
      }),
      this.raindrop.deleteObject({
        bucket_name: this.bucketName,
        key: getMCPCredentialsPath(userId),
      }),
      this.raindrop.deleteObject({
        bucket_name: this.bucketName,
        key: getMCPMetadataPath(userId),
      }),
    ];

    return Promise.all(deletePromises);
  }

  /**
   * List all files for user's MCP server
   */
  async listServerFiles(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const prefix = getUserKey(userId, 'mcp-server/');

    return this.raindrop.listObjects({
      bucket_name: this.bucketName,
      prefix,
    });
  }

  /**
   * Check if user has MCP server
   */
  async hasServer(userId: string): Promise<boolean> {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    try {
      const code = await this.getServerCode(userId);
      return code !== null && code !== '';
    } catch (error) {
      return false;
    }
  }
}
