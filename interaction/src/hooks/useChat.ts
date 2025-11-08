/**
 * useChat hook - Manages conversations and chat operations
 */

import { useState, useEffect, useRef } from 'react';
import {
  sendMessage,
  uploadFile,
  listConversations,
  getConversation as fetchConversation,
  deleteConversation as deleteConv,
} from '../api/client';
import type { Conversation, Message, ConversationMessage } from '../types';

const CURRENT_CONV_KEY = 'current-conversation-id';

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    // Restore last conversation
    const lastConvId = localStorage.getItem(CURRENT_CONV_KEY);
    if (lastConvId) {
      loadConversation(lastConvId);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const convs = await listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const conv = await fetchConversation(id);
      setCurrentConversationId(id);
      localStorage.setItem(CURRENT_CONV_KEY, id);

      // Convert conversation messages to Message format
      const msgs: Message[] = conv.messages.map((msg: ConversationMessage) => ({
        id: `${msg.role}-${msg.timestamp}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));

      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const response = await sendMessage(content, currentConversationId || undefined);

      // Update current conversation ID
      if (!currentConversationId) {
        setCurrentConversationId(response.conversationId);
        localStorage.setItem(CURRENT_CONV_KEY, response.conversationId);
      }

      // Convert conversation messages to Message format
      const msgs: Message[] = response.conversation.messages.map((msg: ConversationMessage) => ({
        id: `${msg.role}-${msg.timestamp}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));

      setMessages(msgs);

      // Reload conversations list
      await loadConversations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Chat error:', error);
      // Show error in chat
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (isLoading) return;

    setIsLoading(true);

    // Show uploading message
    setMessages((prev) => [
      ...prev,
      {
        id: `upload-${Date.now()}`,
        role: 'user',
        content: `Uploading file: ${file.name}`,
        timestamp: new Date(),
      },
    ]);

    try {
      const response = await uploadFile(file);
      const message = response.status === 'success'
        ? `File uploaded successfully! I've added "${response.filename}" to your knowledge base.`
        : `Upload failed: ${response.error || 'Unknown error'}`;

      setMessages((prev) => [
        ...prev,
        {
          id: `upload-response-${Date.now()}`,
          role: 'assistant',
          content: message,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Upload error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `upload-error-${Date.now()}`,
          role: 'assistant',
          content: `Upload error: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const newConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    localStorage.removeItem(CURRENT_CONV_KEY);
  };

  const selectConversation = (id: string) => {
    loadConversation(id);
  };

  const deleteConversation = async (id: string) => {
    try {
      await deleteConv(id);
      await loadConversations();

      // If deleted current conversation, create new one
      if (id === currentConversationId) {
        newConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    messagesEndRef,
    sendMessage: handleSendMessage,
    uploadFile: handleFileUpload,
    newConversation,
    selectConversation,
    deleteConversation,
  };
}
