/**
 * Sidebar component - Conversation list with collapsible functionality
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { Conversation } from '../types';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

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
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? '4rem' : '16rem' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex flex-col border-r border-border bg-card h-screen"
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              key="new-chat-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <Button
                onClick={onNewConversation}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(!isCollapsed && 'ml-2')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            key="conversations-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto p-2"
          >
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onSelectConversation(conv.id)}
                    className={cn(
                      'group relative rounded-lg p-3 cursor-pointer transition-all',
                      'hover:bg-accent hover:shadow-sm',
                      currentConversationId === conv.id
                        ? 'bg-accent shadow-sm border border-border'
                        : 'border border-transparent'
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium line-clamp-1 flex-1 pr-2">
                        {conv.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this conversation?')) {
                            onDeleteConversation(conv.id);
                          }
                        }}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{conv.messages.length} messages</span>
                      <span>{formatDate(conv.updatedAt)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center p-2 space-y-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewConversation}
            title="New Chat"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
