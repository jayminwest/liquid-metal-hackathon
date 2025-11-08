# Interaction Layer Documentation

Documentation for the frontend/UI layer of the raindrop-hackathon project.

## Architecture Overview

The interaction layer provides the user interface for the AI agent with dynamic MCP tooling.

```
interaction/
└── [Chat interface for user-agent interaction]
```

## Purpose

Provide a web-based chat interface where users can:
- Interact with their AI agent
- Add knowledge to their personal knowledge base
- Request custom tool creation in natural language
- Use dynamically created tools
- View conversation history

## Key Components (Planned)

### Chat Interface
- **Real-time messaging**: WebSocket or polling for live updates
- **Message display**: User messages and agent responses
- **Conversation history**: Session-based chat history
- **Knowledge upload**: Interface to add documents/text to knowledge base

### Tool Management UI
- **Tool creation flow**: Request custom tools through chat
- **OAuth handling**: Complete external service authentication
- **Tool listing**: View available tools
- **Tool execution**: Trigger tools through UI

### Knowledge Management
- **Upload interface**: Add knowledge entries
- **Search interface**: Query knowledge base
- **Sync status**: Show local/remote sync state

## Technology Stack (Planned)

### Frontend Framework
- Simple React/Vue or vanilla JavaScript
- Focus on functionality over polish (hackathon scope)

### Communication
- WebSocket for real-time updates (or polling as fallback)
- REST API calls to backend (`/api/chat`, `/api/knowledge`, `/api/tools`)

### State Management
- Local state for chat messages
- Session storage for conversation history
- Real-time updates from agent

## User Flows

### Flow 1: Chat with Agent
1. User types message in chat input
2. Frontend sends `POST /api/chat` with message
3. Agent processes and responds (may query knowledge)
4. Response displayed in chat interface
5. Conversation continues

### Flow 2: Add Knowledge
1. User uploads document or enters text
2. Frontend sends `POST /api/knowledge` with content
3. Backend stores locally and queues for sync
4. User receives confirmation
5. Knowledge now available for agent queries

### Flow 3: Request Custom Tool
1. User asks agent: "I want to read my Slack channels"
2. Agent recognizes tool creation request
3. Backend (`api/tooling/`) generates MCP server
4. Frontend displays OAuth link if needed
5. User completes OAuth in popup/redirect
6. Tool becomes available
7. User can now use tool through chat

## API Integration

### Chat Endpoints
```
POST   /api/chat              # Send message to agent
GET    /api/chat/history      # Get conversation history
```

### Knowledge Endpoints
```
POST   /api/knowledge         # Add to knowledge base
GET    /api/knowledge/search  # Search knowledge
```

### Tool Endpoints
```
POST   /api/tools/create      # Request tool creation
GET    /api/tools             # List available tools
POST   /api/tools/:id/execute # Execute a tool
```

## File Structure (Planned)

```
interaction/
├── index.html              # Main HTML entry point
├── styles/
│   └── main.css            # Styling (basic, functional)
├── scripts/
│   ├── chat.js             # Chat interface logic
│   ├── knowledge.js        # Knowledge upload/search
│   ├── tools.js            # Tool management
│   └── api.js              # API client wrapper
└── components/             # If using framework
    ├── ChatWindow.jsx
    ├── MessageInput.jsx
    ├── KnowledgeUpload.jsx
    └── ToolList.jsx
```

## Development Workflow

1. **Plan** → Use `/issues/feature` to create UI feature plan
2. **Implement** → Use `/workflows/implement` to build interface
3. **Test** → Manual testing with real backend
4. **Commit** → Use `/git/commit` for proper commit messages
5. **PR** → Use `/git/pull_request` with screenshots

## Validation Strategy

### For Frontend Changes

**Level 1 (Quick)**: lint only
- Use for: Style tweaks, text changes

**Level 2 (Integration)**: Level 1 + manual testing
- Use for: New components, API integration, most work
- Manual testing checklist:
  - Chat interface works
  - Messages send/receive correctly
  - Knowledge upload succeeds
  - Tool creation flow completes

**Level 3 (Release)**: Level 2 + full E2E tests
- Use for: Major UI refactors, authentication changes
- E2E tests with real backend

## Testing Approach

### Manual Testing Checklist

**Chat Interface:**
- [ ] Can send messages
- [ ] Agent responses appear
- [ ] Conversation history persists
- [ ] Error handling displays

**Knowledge Management:**
- [ ] Can upload text/documents
- [ ] Knowledge search works
- [ ] Sync status visible

**Tool Creation:**
- [ ] Can request tool through chat
- [ ] OAuth flow completes (if applicable)
- [ ] Tool appears in available tools list
- [ ] Can execute tool

## UI/UX Guidelines (Hackathon Scope)

### Functional > Polished
- Focus on working features
- Basic styling is sufficient
- Usability over aesthetics
- Clear error messages

### Progressive Enhancement
- Start with basic chat interface
- Add knowledge upload
- Add tool management
- Polish later (post-hackathon)

## Common Patterns

### API Call Pattern

```javascript
async function sendMessage(message) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  } catch (error) {
    console.error('Failed to send message:', error);
    displayError(error.message);
  }
}
```

### Real-time Updates Pattern

```javascript
// WebSocket approach
const ws = new WebSocket('ws://localhost:3000/chat');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  displayMessage(message);
};

// Polling approach (fallback)
async function pollForUpdates() {
  const messages = await fetch('/api/chat/updates');
  messages.forEach(displayMessage);
  setTimeout(pollForUpdates, 1000);
}
```

## Out of Scope (Hackathon)

- Advanced UI polish
- Responsive design
- Mobile optimization
- User authentication UI
- Team collaboration features
- Accessibility (ARIA, etc.)
- Internationalization
- Performance optimization

## Future Enhancements (Post-Hackathon)

- Rich text editing for knowledge
- Tool versioning UI
- Analytics dashboard
- Mobile app
- Team collaboration
- Advanced search filters
- Knowledge visualization

## References

- **PRD.md**: Feature requirements for interaction layer
- **README.md**: How to run the frontend
- **api.md**: Backend API documentation
