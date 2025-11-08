/**
 * Main App component - Chat interface with sidebar
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, FolderOpen } from 'lucide-react';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { FileUpload } from './components/FileUpload';
import { Sidebar } from './components/Sidebar';
import { MarkdownBrowser } from './components/MarkdownBrowser';
import { Button } from './components/ui/button';
import { useChat } from './hooks/useChat';

function App() {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    status,
    messagesEndRef,
    sendMessage,
    uploadFile,
    newConversation,
    selectConversation,
    deleteConversation,
  } = useChat();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={newConversation}
        onDeleteConversation={deleteConversation}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Knowledge Assistant</h1>
                <p className="text-xs text-muted-foreground">
                  Powered by GPT-5 with hybrid retrieval
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBrowserOpen(true)}
                title="Browse knowledge base files"
              >
                <FolderOpen className="h-4 w-4" />
                Browse
              </Button>
              <FileUpload onFileSelect={uploadFile} disabled={isLoading} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-6">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center text-center py-12"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
                  <Brain className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Welcome to your Knowledge Assistant</h2>
                <p className="text-muted-foreground max-w-md">
                  Ask me anything about your knowledge base, or upload documents to get started.
                </p>
              </motion.div>
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && <TypingIndicator status={status} />}

            <div ref={messagesEndRef} />
          </div>
        </main>

        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>

      <MarkdownBrowser isOpen={isBrowserOpen} onClose={() => setIsBrowserOpen(false)} />
    </div>
  );
}

export default App;
