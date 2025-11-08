/**
 * Main App component - Chat interface with sidebar
 */

import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { FileUpload } from './components/FileUpload';
import { Sidebar } from './components/Sidebar';
import { useChat } from './hooks/useChat';
import './App.css';

function App() {
  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    messagesEndRef,
    sendMessage,
    uploadFile,
    newConversation,
    selectConversation,
    deleteConversation,
  } = useChat();

  return (
    <div className="app-container">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={newConversation}
        onDeleteConversation={deleteConversation}
      />

      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>Knowledge Assistant</h1>
            <FileUpload onFileSelect={uploadFile} disabled={isLoading} />
          </div>
        </header>

        <main className="messages-container">
          <div className="messages-list">
            {messages.length === 0 && (
              <div className="empty-state">
                <h2>Welcome to your Knowledge Assistant</h2>
                <p className="text-muted">
                  Ask me anything about your knowledge base, or upload documents to get started.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="app-footer">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </footer>
      </div>
    </div>
  );
}

export default App;
