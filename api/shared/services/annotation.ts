/**
 * Annotation service
 * Manages metadata and breadcrumbs using Raindrop annotations
 */

import { RaindropClient } from '../raindrop';
import type { MCPClientConfig } from '../types';
import { getToolAnnotationId, getMCPServerAnnotationId } from '../utils/userScoping';
import { isValidUserId, isValidAnnotationId } from '../utils/validation';

export class AnnotationService {
  private raindrop: RaindropClient;

  constructor(config: MCPClientConfig) {
    this.raindrop = new RaindropClient(config);
  }

  /**
   * Store tool metadata as annotation
   */
  async putToolMetadata(
    userId: string,
    toolId: string,
    metadata: {
      name: string;
      status: 'active' | 'inactive' | 'auth_required';
      oauthComplete: boolean;
      createdAt: string;
      [key: string]: any;
    }
  ) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const annotationId = getToolAnnotationId(userId, toolId);
    const content = JSON.stringify(metadata);

    return this.raindrop.putAnnotation({
      annotation_id: annotationId,
      content,
      tags: ['tool', `user:${userId}`, `tool:${toolId}`],
      metadata: {
        userId,
        toolId,
        type: 'tool_metadata',
      },
    });
  }

  /**
   * Retrieve tool metadata
   */
  async getToolMetadata(userId: string, toolId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const annotationId = getToolAnnotationId(userId, toolId);
    const result = await this.raindrop.getAnnotation({ annotation_id: annotationId });

    if (result.content) {
      return JSON.parse(result.content);
    }

    return null;
  }

  /**
   * Store MCP server metadata
   */
  async putServerMetadata(
    userId: string,
    metadata: {
      toolCount: number;
      lastUpdated: string;
      status: 'active' | 'inactive';
      [key: string]: any;
    }
  ) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const annotationId = getMCPServerAnnotationId(userId);
    const content = JSON.stringify(metadata);

    return this.raindrop.putAnnotation({
      annotation_id: annotationId,
      content,
      tags: ['mcp-server', `user:${userId}`],
      metadata: {
        userId,
        type: 'server_metadata',
      },
    });
  }

  /**
   * Retrieve MCP server metadata
   */
  async getServerMetadata(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const annotationId = getMCPServerAnnotationId(userId);
    const result = await this.raindrop.getAnnotation({ annotation_id: annotationId });

    if (result.content) {
      return JSON.parse(result.content);
    }

    return null;
  }

  /**
   * List all tools for a user
   */
  async listUserTools(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const result = await this.raindrop.listAnnotations({
      tags: ['tool', `user:${userId}`],
      limit: 100,
    });

    return result.annotations.map((ann: any) => {
      try {
        return {
          ...JSON.parse(ann.content),
          annotationId: ann.annotation_id,
        };
      } catch (error) {
        console.error('Failed to parse annotation:', error);
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * Create custom annotation
   */
  async putAnnotation(
    annotationId: string,
    content: any,
    tags: string[] = [],
    metadata: Record<string, any> = {}
  ) {
    if (!isValidAnnotationId(annotationId)) {
      throw new Error('Invalid annotationId');
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    return this.raindrop.putAnnotation({
      annotation_id: annotationId,
      content: contentStr,
      tags,
      metadata,
    });
  }

  /**
   * Get custom annotation
   */
  async getAnnotation(annotationId: string) {
    if (!isValidAnnotationId(annotationId)) {
      throw new Error('Invalid annotationId');
    }

    const result = await this.raindrop.getAnnotation({ annotation_id: annotationId });

    if (result.content) {
      try {
        return {
          content: JSON.parse(result.content),
          metadata: result.metadata,
          tags: result.tags,
        };
      } catch {
        // If not JSON, return as string
        return {
          content: result.content,
          metadata: result.metadata,
          tags: result.tags,
        };
      }
    }

    return null;
  }
}
