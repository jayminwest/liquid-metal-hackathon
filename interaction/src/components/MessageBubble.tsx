/**
 * MessageBubble component - Displays a chat message with markdown rendering
 */

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import type { Message } from '../types';
import './MessageBubble.css';

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

  return (
    <div className={`message-bubble message-${message.role}`}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? 'You' : 'Assistant'}
        </span>
        <span className="message-time text-muted text-small">
          {formattedTime}
        </span>
      </div>
      <div
        className="message-content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
