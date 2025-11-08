/**
 * MCP Builder
 * Coordinates agent-based MCP tool building workflow
 */

import { ToolBuilderAgent, type ToolAnalysis, type GeneratedTool } from '../agent/toolBuilderAgent';
import { OrchestrationClient, type WorkflowContext } from '../agent/orchestrationClient';
import { mergeToolIntoServer, type ExistingMCPServer, type NewTool } from './toolMerger';
import { generateMCPServer, type MCPServerConfig } from '../templates/base.template';
import { MCPStorageService } from '../../shared/services/mcpStorage';
import { MCPRegistryService } from '../../shared/services/mcpRegistry';
import type { MCPClientConfig } from '../../shared/types';

export interface ToolBuildRequest {
  userId: string;
  userRequest: string;
  context?: string;
}

export interface ToolBuildResult {
  success: boolean;
  toolId?: string;
  toolName?: string;
  status?: 'pending_oauth' | 'active';
  oauthUrl?: string;
  error?: string;
  metadata?: {
    service: string;
    description: string;
    requiresAuth: boolean;
  };
}

/**
 * MCP Builder
 * Orchestrates the complete tool building workflow using Claude SDK agent
 */
export class MCPBuilder {
  private agent: ToolBuilderAgent;
  private orchestration: OrchestrationClient;
  private mcpStorage: MCPStorageService;
  private mcpRegistry: MCPRegistryService;

  constructor(config: MCPClientConfig, anthropicApiKey?: string) {
    this.agent = new ToolBuilderAgent(anthropicApiKey);
    this.orchestration = new OrchestrationClient(config);
    this.mcpStorage = new MCPStorageService(config);
    this.mcpRegistry = new MCPRegistryService(config);
  }

  /**
   * Build a new MCP tool from user request
   * This is the main entry point for tool creation
   */
  async buildTool(request: ToolBuildRequest): Promise<ToolBuildResult> {
    let workflowCtx: WorkflowContext | null = null;

    try {
      // Step 1: Start orchestration workflow
      workflowCtx = await this.orchestration.startToolBuildWorkflow(
        request.userId,
        request.userRequest,
        request.context
      );

      console.log(`[MCPBuilder] Started workflow ${workflowCtx.sessionId} for user ${request.userId}`);

      // Step 2: Analyze user request using Claude agent
      const analysis = await this.agent.analyzeRequest(request.userRequest, request.context);

      console.log(`[MCPBuilder] Analysis complete:`, {
        service: analysis.service,
        toolName: analysis.toolName,
        authMethod: analysis.authentication.method,
      });

      await this.orchestration.reportProgress(workflowCtx, 'analysis', { analysis });

      // Step 3: Generate tool code using Claude agent
      const generatedTool = await this.agent.generateTool(analysis);

      console.log(`[MCPBuilder] Code generation complete:`, {
        toolId: generatedTool.toolId,
        hasDependencies: generatedTool.dependencies.length > 0,
        hasOAuth: !!generatedTool.oauthConfig,
      });

      await this.orchestration.reportProgress(workflowCtx, 'code_generation', {
        toolId: generatedTool.toolId,
      });

      // Step 4: Check if user already has MCP server
      const hasExistingServer = await this.mcpStorage.hasServer(request.userId);

      let serverCode: string;
      let metadata: any;

      if (hasExistingServer) {
        // Merge new tool into existing server
        const existingCode = await this.mcpStorage.getServerCode(request.userId);
        const existingMetadata = await this.mcpStorage.getMetadata(request.userId);

        const existingServer: ExistingMCPServer = {
          code: existingCode,
          metadata: existingMetadata || { tools: [], version: '1.0.0', lastUpdated: new Date().toISOString() },
        };

        const newTool: NewTool = {
          toolId: generatedTool.toolId,
          toolName: analysis.toolName,
          handlerCode: generatedTool.handlerCode,
          toolDefinition: generatedTool.toolDefinition,
        };

        const merged = await mergeToolIntoServer(existingServer, newTool);
        serverCode = merged.updatedCode;
        metadata = merged.updatedMetadata;
      } else {
        // Create new MCP server
        const serverConfig: MCPServerConfig = {
          name: `${request.userId}-tools`,
          version: '1.0.0',
          tools: [generatedTool.toolDefinition],
        };

        serverCode = generatedTool.serverCode || generateMCPServer(serverConfig);
        // Insert handler code
        serverCode = serverCode.replace('// Tool handlers', generatedTool.handlerCode);

        metadata = {
          userId: request.userId,
          status: 'active',
          toolCount: 1,
          lastUpdated: new Date().toISOString(),
          tools: [analysis.toolName],
          version: '1.0.0',
        };
      }

      // Step 5: Store MCP server code
      await this.mcpStorage.storeServerCode(request.userId, serverCode);
      await this.mcpStorage.storeMetadata(request.userId, metadata);

      await this.orchestration.reportProgress(workflowCtx, 'storage', {
        stored: true,
        toolCount: metadata.toolCount,
      });

      // Step 6: Register tool in registry
      const toolStatus = generatedTool.oauthConfig ? 'pending_oauth' : 'active';

      await this.mcpRegistry.registerTool(request.userId, {
        id: generatedTool.toolId,
        name: analysis.toolName,
        template: analysis.service,
        status: toolStatus,
        description: analysis.description,
        oauthComplete: !generatedTool.oauthConfig,
      });

      // Step 7: Generate OAuth URL if needed
      let oauthUrl: string | undefined;
      if (generatedTool.oauthConfig) {
        oauthUrl = this.generateOAuthUrl(
          request.userId,
          generatedTool.toolId,
          generatedTool.oauthConfig
        );
      }

      // Step 8: Complete workflow
      await this.orchestration.completeWorkflow(workflowCtx, {
        success: true,
        toolId: generatedTool.toolId,
      });

      console.log(`[MCPBuilder] Tool build complete:`, {
        toolId: generatedTool.toolId,
        status: toolStatus,
        requiresOAuth: !!oauthUrl,
      });

      return {
        success: true,
        toolId: generatedTool.toolId,
        toolName: analysis.toolName,
        status: toolStatus,
        oauthUrl,
        metadata: {
          service: analysis.service,
          description: analysis.description,
          requiresAuth: !!generatedTool.oauthConfig,
        },
      };
    } catch (error: any) {
      console.error('[MCPBuilder] Tool build failed:', error);

      if (workflowCtx) {
        await this.orchestration.failWorkflow(workflowCtx, error.message);
      }

      return {
        success: false,
        error: error.message || 'Tool build failed',
      };
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  private generateOAuthUrl(
    userId: string,
    toolId: string,
    oauthConfig: {
      provider: string;
      scopes: string[];
      authUrl: string;
    }
  ): string {
    // For hackathon: Simple OAuth URL generation
    // Production: Use proper OAuth library with state, PKCE, etc.
    const clientId = process.env[`${oauthConfig.provider.toUpperCase()}_CLIENT_ID`] || 'MISSING_CLIENT_ID';
    const redirectUri = encodeURIComponent(
      `${process.env.APP_URL || 'http://localhost:3000'}/api/tools/oauth/callback`
    );
    const scope = encodeURIComponent(oauthConfig.scopes.join(' '));
    const state = encodeURIComponent(`${userId}:${toolId}`);

    return `${oauthConfig.authUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=code`;
  }

  /**
   * Update tool after OAuth completion
   */
  async updateToolAfterOAuth(userId: string, toolId: string, credentials: Record<string, any>): Promise<void> {
    try {
      // Store credentials
      const existing = await this.mcpStorage.getCredentials(userId);
      await this.mcpStorage.storeCredentials(userId, {
        ...existing,
        ...credentials,
      });

      // Update tool status
      const tool = await this.mcpRegistry.getTool(userId, toolId);
      if (tool) {
        await this.mcpRegistry.updateTool(userId, toolId, {
          ...tool,
          status: 'active',
          oauthComplete: true,
        });
      }

      console.log(`[MCPBuilder] OAuth completed for tool ${toolId}`);
    } catch (error: any) {
      console.error('[MCPBuilder] OAuth update failed:', error);
      throw error;
    }
  }
}
