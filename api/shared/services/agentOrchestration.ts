/**
 * Agent Orchestration service
 * Manages Raindrop orchestration workflows for agent-driven tool building
 */

import { RaindropClient } from '../raindrop';
import type { MCPClientConfig } from '../types';
import { validateSessionId, sanitizeError } from '../validation';

/**
 * Orchestration workflow state tracking
 */
export interface OrchestrationState {
  sessionId: string;
  timelineId: string;
  currentState: string;
  artifacts: Record<string, any>;
}

/**
 * Agent Orchestration Service
 *
 * Wraps Raindrop orchestration MCP tools for managing agent workflows:
 * - get-prompt: Get instructions for current workflow state
 * - update-state: Report task completion and transition state
 * - jump-to-state: Jump to specific state for feature addition or debugging
 */
export class AgentOrchestrationService {
  private raindrop: RaindropClient;

  constructor(config: MCPClientConfig) {
    this.raindrop = new RaindropClient(config);
  }

  /**
   * Get orchestrator instructions for current workflow state
   * Call without session_id to start new workflow, or with session_id to continue
   */
  async getPrompt(sessionId?: string): Promise<{
    sessionId: string;
    timelineId: string;
    prompt: string;
    state: string;
    artifacts?: Record<string, any>;
  }> {
    try {
      if (sessionId) {
        validateSessionId(sessionId);
      }

      const result = await globalThis.mcp__raindrop_mcp__get_prompt({
        session_id: sessionId,
      });

      return {
        sessionId: result.session_id || sessionId || '',
        timelineId: result.timeline_id || '',
        prompt: result.prompt || '',
        state: result.state || 'initial',
        artifacts: result.artifacts || {},
      };
    } catch (error: any) {
      console.error('[Orchestration] get-prompt error:', error);
      throw sanitizeError(error, 'Failed to get orchestration prompt');
    }
  }

  /**
   * Report task completion and transition workflow state
   * Returns orchestrator instructions for next step
   */
  async updateState(params: {
    sessionId: string;
    timelineId: string;
    artifacts: Record<string, any>;
    status: 'complete' | 'failed' | 'blocked';
    notes?: string;
  }): Promise<{
    nextState: string;
    prompt: string;
    artifacts: Record<string, any>;
  }> {
    try {
      validateSessionId(params.sessionId);

      const result = await globalThis.mcp__raindrop_mcp__update_state({
        session_id: params.sessionId,
        timeline_id: params.timelineId,
        artifacts: params.artifacts,
        status: params.status,
        notes: params.notes,
      });

      return {
        nextState: result.next_state || result.state || '',
        prompt: result.prompt || '',
        artifacts: result.artifacts || {},
      };
    } catch (error: any) {
      console.error('[Orchestration] update-state error:', error);
      throw sanitizeError(error, 'Failed to update orchestration state');
    }
  }

  /**
   * Jump to a specific state for feature addition or debugging
   * Use this to resume development on existing applications
   */
  async jumpToState(params: {
    sessionId: string;
    targetState: 'merge_features' | 'endpoint_test';
    mode: 'feature_addition' | 'debug';
    contextArtifacts?: Record<string, any>;
  }): Promise<{
    state: string;
    prompt: string;
    artifacts: Record<string, any>;
  }> {
    try {
      validateSessionId(params.sessionId);

      const result = await globalThis.mcp__raindrop_mcp__jump_to_state({
        session_id: params.sessionId,
        target_state: params.targetState,
        mode: params.mode,
        context_artifacts: params.contextArtifacts,
      });

      return {
        state: result.state || params.targetState,
        prompt: result.prompt || '',
        artifacts: result.artifacts || {},
      };
    } catch (error: any) {
      console.error('[Orchestration] jump-to-state error:', error);
      throw sanitizeError(error, 'Failed to jump to orchestration state');
    }
  }

  /**
   * Start a new orchestration workflow session
   * This creates a working memory session for the orchestration
   */
  async startWorkflow(): Promise<{
    sessionId: string;
    timelineId: string;
    initialPrompt: string;
  }> {
    try {
      // Start a new session
      const sessionResult = await this.raindrop.startSession();
      const sessionId = sessionResult.session_id;

      // Get initial prompt
      const promptResult = await this.getPrompt(sessionId);

      return {
        sessionId: promptResult.sessionId,
        timelineId: promptResult.timelineId,
        initialPrompt: promptResult.prompt,
      };
    } catch (error: any) {
      console.error('[Orchestration] start-workflow error:', error);
      throw sanitizeError(error, 'Failed to start orchestration workflow');
    }
  }

  /**
   * Complete an orchestration workflow
   * This ends the session and optionally flushes to episodic memory
   */
  async completeWorkflow(sessionId: string, flush: boolean = true): Promise<void> {
    try {
      validateSessionId(sessionId);

      await this.raindrop.endSession({
        session_id: sessionId,
        flush,
      });
    } catch (error: any) {
      console.error('[Orchestration] complete-workflow error:', error);
      throw sanitizeError(error, 'Failed to complete orchestration workflow');
    }
  }
}
