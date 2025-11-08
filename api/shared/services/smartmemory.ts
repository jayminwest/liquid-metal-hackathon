/**
 * SmartMemory service
 * Manages session memory and conversation context
 */

import { RaindropClient } from '../raindrop';
import type { MCPClientConfig } from '../types';
import { getSessionMemoryKey } from '../utils/userScoping';
import { isValidUserId, isValidSessionId } from '../utils/validation';

export class SmartMemoryService {
  private raindrop: RaindropClient;

  constructor(config: MCPClientConfig) {
    this.raindrop = new RaindropClient(config);
  }

  /**
   * Start a new session
   */
  async startSession() {
    return this.raindrop.startSession();
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, flush: boolean = false) {
    if (!isValidSessionId(sessionId)) {
      throw new Error('Invalid sessionId');
    }

    return this.raindrop.endSession({
      session_id: sessionId,
      flush,
    });
  }

  /**
   * Store memory in session
   */
  async putMemory(
    sessionId: string,
    userId: string,
    content: string,
    options: {
      timeline?: string;
      agent?: string;
    } = {}
  ) {
    if (!isValidSessionId(sessionId)) {
      throw new Error('Invalid sessionId');
    }
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const key = getSessionMemoryKey(userId, sessionId);

    return this.raindrop.putMemory({
      session_id: sessionId,
      content,
      key,
      timeline: options.timeline,
      agent: options.agent,
    });
  }

  /**
   * Retrieve memories from session
   */
  async getMemory(
    sessionId: string,
    userId: string,
    options: {
      timeline?: string;
      n_most_recent?: number;
    } = {}
  ) {
    if (!isValidSessionId(sessionId)) {
      throw new Error('Invalid sessionId');
    }
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    const key = getSessionMemoryKey(userId, sessionId);

    return this.raindrop.getMemory({
      session_id: sessionId,
      key,
      timeline: options.timeline,
      n_most_recent: options.n_most_recent,
    });
  }

  /**
   * Search memories semantically
   */
  async searchMemory(
    sessionId: string,
    userId: string,
    query: string,
    options: {
      timeline?: string;
      n_most_recent?: number;
    } = {}
  ) {
    if (!isValidSessionId(sessionId)) {
      throw new Error('Invalid sessionId');
    }
    if (!isValidUserId(userId)) {
      throw new Error('Invalid userId');
    }

    return this.raindrop.searchMemory({
      session_id: sessionId,
      terms: query,
      timeline: options.timeline,
      n_most_recent: options.n_most_recent,
    });
  }

  /**
   * Summarize session memories
   */
  async summarizeMemory(
    sessionId: string,
    options: {
      timeline?: string;
      n_most_recent?: number;
      system_prompt?: string;
    } = {}
  ) {
    if (!isValidSessionId(sessionId)) {
      throw new Error('Invalid sessionId');
    }

    return this.raindrop.summarizeMemory({
      session_id: sessionId,
      timeline: options.timeline,
      n_most_recent: options.n_most_recent,
      system_prompt: options.system_prompt,
    });
  }
}
