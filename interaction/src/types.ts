/**
 * Frontend TypeScript types for chat interface
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
}

export interface UploadResponse {
  status: 'success' | 'error';
  filename: string;
  entity_path?: string;
  error?: string;
}
