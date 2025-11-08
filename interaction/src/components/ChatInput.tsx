/**
 * ChatInput component - Auto-resizing textarea with send button
 */

import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
      // Reset height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-card">
      <textarea
        ref={textareaRef}
        className={cn(
          'flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3',
          'text-sm placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200'
        )}
        value={message}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
        disabled={disabled}
        rows={1}
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="h-11 w-11 shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
