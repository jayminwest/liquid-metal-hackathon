/**
 * basic-memory MCP client wrapper
 * Provides a clean interface to basic-memory MCP tools
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * basic-memory MCP Client
 *
 * Simple file-based implementation for the hackathon
 */
export class BasicMemoryClient {
  private workingDir: string;

  constructor(workingDir: string = './data') {
    this.workingDir = workingDir;
  }

  private getFullPath(filePath: string): string {
    return path.join(this.workingDir, filePath);
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  // Note Operations
  async writeNote(params: {
    path: string;
    content: string;
  }) {
    const fullPath = this.getFullPath(params.path);
    const dirPath = path.dirname(fullPath);
    await this.ensureDir(dirPath);
    await fs.writeFile(fullPath, params.content, 'utf-8');
    return { success: true, path: params.path };
  }

  async readNote(params: {
    path: string;
  }) {
    const fullPath = this.getFullPath(params.path);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return { content };
    } catch (error) {
      return { content: '' };
    }
  }

  async editNote(params: {
    path: string;
    content: string;
  }) {
    return await this.writeNote(params);
  }

  async deleteNote(params: {
    path: string;
  }) {
    const fullPath = this.getFullPath(params.path);
    try {
      await fs.unlink(fullPath);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  // Context & Search
  async buildContext(params: {
    paths: string[];
    depth?: number;
  }) {
    let context = '';
    for (const p of params.paths) {
      const result = await this.readNote({ path: p });
      if (result.content) {
        context += `\n--- ${p} ---\n${result.content}\n`;
      }
    }
    return { context };
  }

  async query(params: {
    query: string;
    limit?: number;
  }) {
    const results: any[] = [];
    const entitiesDir = this.getFullPath('entities');

    try {
      const files = await this.listAllFiles(entitiesDir);
      const limit = params.limit || 10;

      for (const file of files.slice(0, limit)) {
        const content = await fs.readFile(file, 'utf-8');
        const relativePath = path.relative(this.workingDir, file);
        results.push({
          path: relativePath,
          name: path.basename(file),
          content,
        });
      }
    } catch (error) {
      console.error('Query error:', error);
    }

    return { results };
  }

  private async listAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...await this.listAllFiles(fullPath));
        } else if (entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
    return files;
  }

  async recentActivity(params?: {
    limit?: number;
  }) {
    const activities: any[] = [];
    const entitiesDir = this.getFullPath('entities');

    try {
      const files = await this.listAllFiles(entitiesDir);
      const limit = params?.limit || 10;

      // Get file stats and sort by modification time
      const filesWithStats = await Promise.all(
        files.map(async (file) => ({
          file,
          stats: await fs.stat(file),
        }))
      );

      filesWithStats
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())
        .slice(0, limit)
        .forEach(({ file, stats }) => {
          activities.push({
            path: path.relative(this.workingDir, file),
            modified: stats.mtime.toISOString(),
          });
        });
    } catch (error) {
      console.error('Recent activity error:', error);
    }

    return { activities };
  }

  // Visualization
  async canvas(params: {
    paths?: string[];
    type?: 'graph' | 'timeline';
  }) {
    // TODO: Call basic-memory canvas MCP tool
    console.log('canvas:', params);
    return { visualization: '' };
  }

  // Project Management
  async listProjects() {
    // TODO: Call basic-memory list_memory_projects MCP tool
    console.log('listProjects');
    return { projects: [] };
  }

  async createProject(params: {
    name: string;
    description?: string;
  }) {
    // TODO: Call basic-memory create_memory_project MCP tool
    console.log('createProject:', params);
    return { success: true, project_id: params.name };
  }

  async getCurrentProject() {
    // TODO: Call basic-memory get_current_project MCP tool
    console.log('getCurrentProject');
    return { project: null };
  }

  async listDirectory(params?: {
    path?: string;
  }) {
    const dirPath = this.getFullPath(params?.path || '');
    console.log('[basicMemory] listDirectory - dirPath:', dirPath);
    try {
      // Ensure directory exists before reading
      await this.ensureDir(dirPath);
      console.log('[basicMemory] Directory ensured');
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      console.log('[basicMemory] Found entries:', entries.length);
      const files = entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
      }));
      return { files };
    } catch (error) {
      console.error('[basicMemory] List directory error for path:', dirPath, error);
      return { files: [] };
    }
  }

  // Helper methods for AI service
  async search(params: { query: string; limit?: number }) {
    return (await this.query(params)).results;
  }

  async getEntity(name: string) {
    const filePath = name.endsWith('.md') ? name : `entities/${name}.md`;
    const result = await this.readNote({ path: filePath });
    return result.content ? { content: result.content, path: filePath } : null;
  }

  async createEntity(params: {
    name: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    const filePath = params.name.endsWith('.md') ? params.name : `entities/${params.name}.md`;
    await this.writeNote({ path: filePath, content: params.content });
    return { success: true, path: filePath };
  }

  async deleteEntity(name: string) {
    const filePath = name.endsWith('.md') ? name : `entities/${name}.md`;
    return await this.deleteNote({ path: filePath });
  }
}

// Helper function to get basic-memory client
export async function getBasicMemoryClient(): Promise<BasicMemoryClient> {
  return basicMemory;
}

// Export a singleton instance
export const basicMemory = new BasicMemoryClient(
  process.env.BASIC_MEMORY_DIR || './data'
);
