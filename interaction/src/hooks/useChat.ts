/**
 * useChat hook - Manages chat state and operations
 */

import { useState, useEffect, useRef } from 'react';
import { sendMessage, uploadFile } from '../api/client';
import type { Message } from '../types';

const SESSION_KEY = 'chat-session-id';

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(getSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    addMessage('user', content);
    setIsLoading(true);

    try {
      const response = await sendMessage(content, sessionId);
      addMessage('assistant', response.response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addMessage('assistant', `Error: ${errorMessage}`);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (isLoading) return;

    // Add user message about upload
    addMessage('user', `Uploading file: ${file.name}`);
    setIsLoading(true);

    try {
      const response = await uploadFile(file, sessionId);
      if (response.status === 'success') {
        addMessage(
          'assistant',
          `File uploaded successfully! I've added "${response.filename}" to your knowledge base.`
        );
      } else {
        addMessage('assistant', `Upload failed: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addMessage('assistant', `Upload error: ${errorMessage}`);
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    sessionId,
    messagesEndRef,
    sendMessage: handleSendMessage,
    uploadFile: handleFileUpload,
  };
}
