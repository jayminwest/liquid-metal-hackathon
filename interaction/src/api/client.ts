/**
 * API client for backend communication
 */

import type { ChatRequest, ChatResponse, UploadResponse, Conversation, StatusUpdate } from '../types';

const API_BASE = '/api';

/**
 * Send a chat message and get a response with streaming status updates
 */
export async function sendMessageStream(
  message: string,
  conversationId: string | null,
  onStatus: (status: string) => void,
  onResponse: (response: string) => void,
  onError: (error: string) => void
): Promise<string> {
  console.log('[sendMessageStream] Starting request to', `${API_BASE}/chat/stream`);
  console.log('[sendMessageStream] Message:', message.substring(0, 50));
  console.log('[sendMessageStream] ConversationId:', conversationId);

  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      conversationId: conversationId || undefined
    } as ChatRequest),
  });

  console.log('[sendMessageStream] Response received, status:', response.status);
  console.log('[sendMessageStream] Response ok:', response.ok);
  console.log('[sendMessageStream] Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  console.log('[sendMessageStream] Got reader, starting to read stream...');
  let conversationIdResult = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      console.log('[sendMessageStream] Read chunk - done:', done, 'bytes:', value?.length);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const update: StatusUpdate = JSON.parse(data);
            console.log('[SSE] Received update:', update);

            if (update.type === 'status') {
              onStatus(update.message);
            } else if (update.type === 'response') {
              onResponse(update.message);
            } else if (update.type === 'error') {
              onError(update.message);
            } else if (update.type === 'metadata' && update.conversationId) {
              conversationIdResult = update.conversationId;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e, 'Raw data:', data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return conversationIdResult;
}

/**
 * Send a chat message and get a response (non-streaming fallback)
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
