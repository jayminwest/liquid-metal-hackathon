/**
 * Local filesystem fallback for Raindrop storage
 * Used when MCP tools are not available (standalone server mode)
 */

import { mkdir, writeFile, readFile, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const STORAGE_ROOT = join(process.cwd(), '.raindrop-local');

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir() {
  if (!existsSync(STORAGE_ROOT)) {
    await mkdir(STORAGE_ROOT, { recursive: true });
  }
}

/**
 * Get bucket path
 */
function getBucketPath(bucketName: string): string {
  return join(STORAGE_ROOT, bucketName);
}

/**
 * Get object path
 */
function getObjectPath(bucketName: string, key: string): string {
  return join(getBucketPath(bucketName), key);
}

/**
 * Local storage implementation
 */
export class LocalStorage {
  /**
   * Create a bucket (directory)
   */
  async createBucket(bucketName: string): Promise<void> {
    await ensureStorageDir();
    const bucketPath = getBucketPath(bucketName);
    if (!existsSync(bucketPath)) {
      await mkdir(bucketPath, { recursive: true });
    }
  }

  /**
   * Put object
   */
  async putObject(bucketName: string, key: string, content: string): Promise<void> {
    await this.createBucket(bucketName);
    const objectPath = getObjectPath(bucketName, key);

    // Ensure subdirectories exist
    const dir = join(objectPath, '..');
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(objectPath, content, 'utf-8');
  }

  /**
   * Get object
   */
  async getObject(bucketName: string, key: string): Promise<string> {
    const objectPath = getObjectPath(bucketName, key);
    if (!existsSync(objectPath)) {
      throw new Error(`Object not found: ${bucketName}/${key}`);
    }
    return await readFile(objectPath, 'utf-8');
  }

  /**
   * Delete object
   */
  async deleteObject(bucketName: string, key: string): Promise<void> {
    const objectPath = getObjectPath(bucketName, key);
    if (existsSync(objectPath)) {
      await unlink(objectPath);
    }
  }

  /**
   * List objects in bucket
   */
  async listObjects(bucketName: string, prefix?: string): Promise<string[]> {
    const bucketPath = getBucketPath(bucketName);
    if (!existsSync(bucketPath)) {
      return [];
    }

    const files = await readdir(bucketPath, { recursive: true });
    return files
      .filter(f => !prefix || f.startsWith(prefix))
      .filter(f => typeof f === 'string');
  }

  /**
   * Check if object exists
   */
  async hasObject(bucketName: string, key: string): Promise<boolean> {
    const objectPath = getObjectPath(bucketName, key);
    return existsSync(objectPath);
  }

  /**
   * Start session (simple implementation)
   */
  async startSession(): Promise<{ session_id: string }> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { session_id: sessionId };
  }

  /**
   * Get workflow prompt (simplified for local mode)
   * In real Raindrop, this returns orchestrator instructions
   */
  async getPrompt(sessionId?: string): Promise<{
    session_id: string;
    timeline_id: string;
    prompt: string;
    state: string;
  }> {
    const sid = sessionId || `session_${Date.now()}`;
    const tid = `timeline_${Date.now()}`;

    return {
      session_id: sid,
      timeline_id: tid,
      prompt: 'Build the MCP tool as requested',
      state: 'build_tool',
    };
  }

  /**
   * Update workflow state (simplified for local mode)
   */
  async updateState(
    sessionId: string,
    timelineId: string,
    artifacts: Record<string, any>,
    status: string,
    notes?: string
  ): Promise<{
    next_state: string;
    prompt: string;
  }> {
    // In local mode, just return success
    return {
      next_state: 'completed',
      prompt: 'Tool build workflow complete',
    };
  }

  /**
   * Jump to workflow state (simplified for local mode)
   */
  async jumpToState(
    sessionId: string,
    targetState: string,
    mode: string,
    contextArtifacts?: Record<string, any>
  ): Promise<{
    prompt: string;
    state: string;
  }> {
    return {
      prompt: `Jumped to state: ${targetState}`,
      state: targetState,
    };
  }
}

// Export singleton
export const localStorage = new LocalStorage();
