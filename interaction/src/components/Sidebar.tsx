/**
 * Sidebar component - Conversation list with collapsible functionality
 */

import { useState } from 'react';
import type { Conversation } from '../types';
import './Sidebar.css';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button
          className="collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
        {!isCollapsed && (
          <button className="new-chat-button" onClick={onNewConversation}>
            + New Chat
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="empty-conversations">
              <p className="text-muted text-small">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${
                  currentConversationId === conv.id ? 'active' : ''
                }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="conversation-header">
                  <span className="conversation-title">{conv.title}</span>
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this conversation?')) {
                        onDeleteConversation(conv.id);
                      }
                    }}
                    title="Delete conversation"
                  >
                    ×
                  </button>
                </div>
                <div className="conversation-meta">
                  <span className="message-count">
                    {conv.messages.length} messages
                  </span>
                  <span className="conversation-date">
                    {formatDate(conv.updatedAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
