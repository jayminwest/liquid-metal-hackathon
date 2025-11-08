/**
 * SmartBucket service
 * Manages user knowledge storage with semantic search
 */

import { RaindropClient } from '../raindrop';
import type { MCPClientConfig } from '../types';
import { getKnowledgeBucketName, getUserKey } from '../utils/userScoping';
import { isValidUserId, isValidBucketName } from '../utils/validation';

export class SmartBucketService {
  private raindrop: RaindropClient;

  constructor(config: MCPClientConfig) {
    this.raindrop = new RaindropClient(config);
  }

  /**
   * Initialize user's knowledge bucket
   */
  async initializeUserBucket(userId: string) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const bucketName = getKnowledgeBucketName(userId);

    return this.raindrop.createSmartBucket({
      bucket_name: bucketName,
      description: `Knowledge storage for user ${userId}`,
      embedding_model: 'text-embedding-ada-002',
    });
  }

  /**
   * Search user's knowledge base
   */
  async searchKnowledge(
    userId: string,
    query: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const bucketName = getKnowledgeBucketName(userId);

    return this.raindrop.documentSearch({
      bucket_name: bucketName,
      query,
      limit: options.limit || 10,
      threshold: options.threshold || 0.7,
    });
  }

  /**
   * Search knowledge chunks
   */
  async searchChunks(
    userId: string,
    query: string,
    options: {
      documentId?: string;
      limit?: number;
    } = {}
  ) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const bucketName = getKnowledgeBucketName(userId);

    return this.raindrop.chunkSearch({
      bucket_name: bucketName,
      query,
      document_id: options.documentId,
      limit: options.limit || 20,
    });
  }

  /**
   * Query a specific document
   */
  async queryDocument(
    userId: string,
    documentId: string,
    query: string
  ) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const bucketName = getKnowledgeBucketName(userId);

    return this.raindrop.documentQuery({
      bucket_name: bucketName,
      document_id: documentId,
      query,
    });
  }

  /**
   * Store knowledge document (via regular bucket put-object)
   * Note: SmartBucket ingests documents automatically when they're added
   */
  async storeDocument(
    userId: string,
    documentPath: string,
    content: string
  ) {
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const bucketName = getKnowledgeBucketName(userId);
    const key = getUserKey(userId, `knowledge/${documentPath}`);

    return this.raindrop.putObject({
      bucket_name: bucketName,
      key,
      content,
      content_type: 'text/plain',
    });
  }
}
