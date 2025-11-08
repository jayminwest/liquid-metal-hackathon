/**
 * MessageBubble component - Displays a chat message with markdown rendering
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { User, Bot } from 'lucide-react';
import type { Message } from '../types';
import { cn } from '../lib/utils';

interface MessageBubbleProps {
  message: Message;
}

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Custom renderer for code blocks with highlighting
const renderer = new marked.Renderer();
renderer.code = function({ text, lang }: { text: string; lang?: string }) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      const highlighted = hljs.highlight(text, { language: lang }).value;
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    } catch (err) {
      console.error('Highlight error:', err);
    }
  }
  const autoHighlighted = hljs.highlightAuto(text).value;
  return `<pre><code class="hljs">${autoHighlighted}</code></pre>`;
};

marked.use({ renderer });

export function MessageBubble({ message }: MessageBubbleProps) {
  const htmlContent = useMemo(() => {
    const rawHtml = marked.parse(message.content) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [message.content]);

  const formattedTime = useMemo(() => {
    return message.timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [message.timestamp]);

  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex gap-3 p-4 rounded-lg mb-4',
        isUser ? 'bg-secondary/50' : 'bg-card'
      )}
    >
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary' : 'bg-accent'
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-accent-foreground" />
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formattedTime}
          </span>
        </div>
        <div
          className={cn(
            'prose prose-sm dark:prose-invert max-w-none',
            'prose-pre:bg-secondary prose-pre:border prose-pre:border-border',
            'prose-code:text-primary prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
            'prose-a:text-primary hover:prose-a:text-primary/80'
          )}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </motion.div>
  );
}
