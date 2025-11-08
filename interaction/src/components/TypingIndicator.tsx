/**
 * TypingIndicator component - Animated dots while waiting for response
 */

import './TypingIndicator.css';

export function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </div>
  );
}
