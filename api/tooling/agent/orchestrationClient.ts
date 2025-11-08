/**
 * Orchestration Client
 * Wrapper for Raindrop orchestration workflows
 *
 * For hackathon: Simplified orchestration without full workflow state machine
 * In production: Use full Raindrop orchestration with state transitions
 */

import { AgentOrchestrationService } from '../../shared/services/agentOrchestration';
import type { MCPClientConfig } from '../../shared/types';

export interface WorkflowContext {
  sessionId: string;
  timelineId: string;
  userId: string;
  userRequest: string;
  context?: string;
}

export interface WorkflowResult {
  success: boolean;
  toolId?: string;
  serverCode?: string;
  oauthConfig?: any;
  error?: string;
  artifacts?: Record<string, any>;
}

/**
 * Simplified Orchestration Client for Hackathon
 * Coordinates agent workflow without complex state machine
 */
export class OrchestrationClient {
  private orchestrationService: AgentOrchestrationService;

  constructor(config: MCPClientConfig) {
    this.orchestrationService = new AgentOrchestrationService(config);
  }

  /**
   * Start a new tool building workflow
   */
  async startToolBuildWorkflow(userId: string, userRequest: string, context?: string): Promise<WorkflowContext> {
    try {
      // Start new orchestration session
      const { sessionId, timelineId } = await this.orchestrationService.startWorkflow();

      return {
        sessionId,
        timelineId,
        userId,
        userRequest,
        context,
      };
    } catch (error: any) {
      console.error('[OrchestrationClient] Failed to start workflow:', error);
      throw new Error(`Workflow initialization failed: ${error.message}`);
    }
  }

  /**
   * Report progress and get next step
   */
  async reportProgress(
    workflowCtx: WorkflowContext,
    step: string,
    artifacts: Record<string, any>,
    status: 'complete' | 'failed' | 'blocked' = 'complete'
  ): Promise<{
    nextStep: string;
    prompt: string;
  }> {
    try {
      const result = await this.orchestrationService.updateState({
        sessionId: workflowCtx.sessionId,
        timelineId: workflowCtx.timelineId,
        artifacts: {
          step,
          ...artifacts,
        },
        status,
        notes: `Completed ${step}`,
      });

      return {
        nextStep: result.nextState,
        prompt: result.prompt,
      };
    } catch (error: any) {
      console.error('[OrchestrationClient] Progress reporting failed:', error);
      // For hackathon: Continue even if orchestration fails
      return {
        nextStep: 'continue',
        prompt: 'Continue with next step',
      };
    }
  }

  /**
   * Complete the workflow
   */
  async completeWorkflow(workflowCtx: WorkflowContext, _result: WorkflowResult): Promise<void> {
    try {
      await this.orchestrationService.completeWorkflow(workflowCtx.sessionId, true);
      console.log(`[OrchestrationClient] Workflow ${workflowCtx.sessionId} completed successfully`);
    } catch (error: any) {
      console.error('[OrchestrationClient] Failed to complete workflow:', error);
      // Non-fatal error for hackathon
    }
  }

  /**
   * Handle workflow failure
   */
  async failWorkflow(workflowCtx: WorkflowContext, error: string): Promise<void> {
    try {
      await this.orchestrationService.updateState({
        sessionId: workflowCtx.sessionId,
        timelineId: workflowCtx.timelineId,
        artifacts: {
          error,
          failed: true,
        },
        status: 'failed',
        notes: `Workflow failed: ${error}`,
      });

      await this.orchestrationService.completeWorkflow(workflowCtx.sessionId, false);
    } catch (err: any) {
      console.error('[OrchestrationClient] Failed to record workflow failure:', err);
    }
  }
}

/**
 * Simplified workflow manager (for hackathon)
 * Skips complex orchestration and provides a linear workflow
 */
export class SimpleWorkflowManager {
  /**
   * Execute a simple linear workflow without orchestration
   */
  async executeToolBuildWorkflow(
    userId: string,
    userRequest: string,
    context?: string
  ): Promise<WorkflowResult> {
    const workflowId = `workflow_${Date.now()}`;
    console.log(`[SimpleWorkflow] Starting ${workflowId} for user ${userId}`);

    try {
      return {
        success: true,
        artifacts: {
          workflowId,
          userId,
          userRequest,
          context,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
