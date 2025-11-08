/**
 * API client for backend communication
 */

import type { ChatRequest, ChatResponse, UploadResponse, Message, Conversation } from '../types';

const API_BASE = '/api';

/**
 * Send a chat message and get a response
 */
export async function sendMessage(
  message: string,
  conversationId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, conversationId } as ChatRequest),
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
 * List all conversations
 */
export async function listConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE}/conversations`);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }

  const data = await response.json();
  return data.conversations;
}

/**
 * Get specific conversation
 */
export async function getConversation(id: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.statusText}`);
  }

  const data = await response.json();
  return data.conversation;
}

/**
 * Delete conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.statusText}`);
  }
}
