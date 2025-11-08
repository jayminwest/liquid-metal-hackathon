/**
 * Frontend TypeScript types for chat interface
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  sessionId: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  conversation: Conversation;
}

export interface UploadResponse {
  status: 'success' | 'error';
  filename: string;
  entity_path?: string;
  error?: string;
}
