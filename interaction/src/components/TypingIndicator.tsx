/**
 * TypingIndicator component - Animated dots with status message while waiting for response
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  status?: string;
}

export function TypingIndicator({ status }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex gap-3 p-4 rounded-lg mb-4 bg-card"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
        <Bot className="h-4 w-4 text-accent-foreground" />
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <AnimatePresence mode="wait">
          {status ? (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-muted-foreground pt-1"
            >
              {status}
            </motion.div>
          ) : (
            <motion.div
              key="dots"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 pt-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-muted-foreground"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
