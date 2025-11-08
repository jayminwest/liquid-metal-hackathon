/**
 * MCP Registry service
 * Manages tool discovery and listing using annotations
 */

import { AnnotationService } from './annotation';
import { MCPStorageService } from './mcpStorage';
import type { MCPClientConfig, MCPTool, MCPServerMetadata } from '../types';
import { isValidUserId } from '../utils/validation';

export class MCPRegistryService {
  private annotationService: AnnotationService;
  private storageService: MCPStorageService;

  constructor(config: MCPClientConfig) {
    this.annotationService = new AnnotationService(config);
    this.storageService = new MCPStorageService(config);
  }

  /**
   * Register a new tool
   */
  async registerTool(
    userId: string,
    tool: {
      id: string;
      name: string;
      template: string;
      status?: 'active' | 'inactive' | 'auth_required';
      oauthComplete?: boolean;
    }
  ) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const toolMetadata = {
      ...tool,
      status: tool.status || 'inactive',
      oauthComplete: tool.oauthComplete || false,
      createdAt: new Date().toISOString(),
    };

    // Store tool metadata as annotation
    await this.annotationService.putToolMetadata(userId, tool.id, toolMetadata);

    // Update server metadata
    await this.updateServerMetadata(userId);

    return toolMetadata;
  }

  /**
   * Get tool metadata
   */
  async getTool(userId: string, toolId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    return this.annotationService.getToolMetadata(userId, toolId);
  }

  /**
   * List all tools for user
   */
  async listTools(userId: string): Promise<MCPTool[]> {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    return this.annotationService.listUserTools(userId);
  }

  /**
   * Update tool status
   */
  async updateToolStatus(
    userId: string,
    toolId: string,
    status: 'active' | 'inactive' | 'auth_required',
    oauthComplete?: boolean
  ) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const existingTool = await this.getTool(userId, toolId);
    if (!existingTool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const updatedTool = {
      ...existingTool,
      status,
      ...(oauthComplete !== undefined && { oauthComplete }),
      lastUpdated: new Date().toISOString(),
    };

    await this.annotationService.putToolMetadata(userId, toolId, updatedTool);

    return updatedTool;
  }

  /**
   * Remove a tool
   */
  async removeTool(userId: string, toolId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    // Note: Raindrop annotations don't have delete yet, so we mark as inactive
    return this.updateToolStatus(userId, toolId, 'inactive');
  }

  /**
   * Get server metadata
   */
  async getServerMetadata(userId: string): Promise<MCPServerMetadata | null> {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    return this.annotationService.getServerMetadata(userId);
  }

  /**
   * Update server metadata (recalculate from tools)
   */
  async updateServerMetadata(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const tools = await this.listTools(userId);
    const activeTools = tools.filter(t => t.status === 'active');

    const metadata: MCPServerMetadata = {
      toolCount: tools.length,
      lastUpdated: new Date().toISOString(),
      status: activeTools.length > 0 ? 'active' : 'inactive',
    };

    await this.annotationService.putServerMetadata(userId, metadata);

    return metadata;
  }

  /**
   * Check if user has any tools
   */
  async hasTools(userId: string): Promise<boolean> {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const tools = await this.listTools(userId);
    return tools.length > 0;
  }

  /**
   * Get active tools only
   */
  async getActiveTools(userId: string): Promise<MCPTool[]> {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const tools = await this.listTools(userId);
    return tools.filter(t => t.status === 'active');
  }

  /**
   * Get tools requiring authentication
   */
  async getToolsNeedingAuth(userId: string): Promise<MCPTool[]> {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const tools = await this.listTools(userId);
    return tools.filter(t => t.status === 'auth_required' || !t.oauthComplete);
  }
}
