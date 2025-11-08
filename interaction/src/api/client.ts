/**
 * API client for backend communication
 */

import type { ChatRequest, ChatResponse, UploadResponse, Message } from '../types';

const API_BASE = '/api';

/**
 * Send a chat message and get a response
 */
export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId && { 'X-Session-ID': sessionId }),
    },
    body: JSON.stringify({ message } as ChatRequest),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a file to the knowledge base
 */
export async function uploadFile(
  file: File,
  sessionId?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/knowledge/upload`, {
    method: 'POST',
    headers: {
      ...(sessionId && { 'X-Session-ID': sessionId }),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`File upload failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get chat history (optional for future implementation)
 */
export async function getChatHistory(sessionId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE}/chat/history`, {
    headers: {
      'X-Session-ID': sessionId,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }

  return response.json();
}
