/**
 * Conversation Management - Store chats as markdown entities with Raindrop sync
 */

import { getBasicMemoryClient } from './basicMemory';
import { getRaindropClient } from './raindrop';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  sessionId: string;
}

/**
 * Generate conversation title from first user message
 */
function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().substring(0, 60);
  return cleaned.length < firstMessage.trim().length ? `${cleaned}...` : cleaned;
}

/**
 * Convert conversation to markdown format
 */
function conversationToMarkdown(conversation: Conversation): string {
  const lines = [
    `# ${conversation.title}`,
    '',
    `**Created:** ${conversation.createdAt}`,
    `**Updated:** ${conversation.updatedAt}`,
    `**Session ID:** ${conversation.sessionId}`,
    '',
    '---',
    '',
  ];

  for (const msg of conversation.messages) {
    lines.push(`## ${msg.role === 'user' ? 'User' : 'Assistant'} (${msg.timestamp})`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse markdown back to conversation
 */
function markdownToConversation(markdown: string, id: string): Conversation {
  const lines = markdown.split('\n');
  const title = lines[0].replace(/^# /, '');

  const createdMatch = markdown.match(/\*\*Created:\*\* (.+)/);
  const updatedMatch = markdown.match(/\*\*Updated:\*\* (.+)/);
  const sessionMatch = markdown.match(/\*\*Session ID:\*\* (.+)/);

  const messages: ConversationMessage[] = [];
  const msgRegex = /## (User|Assistant) \((.+?)\)/g;
  let match;
  let currentIndex = 0;

  while ((match = msgRegex.exec(markdown)) !== null) {
    const role = match[1].toLowerCase() as 'user' | 'assistant';
    const timestamp = match[2];
    const startIndex = match.index + match[0].length;

    // Find next message or end of file
    msgRegex.lastIndex = startIndex;
    const nextMatch = msgRegex.exec(markdown);
    const endIndex = nextMatch ? nextMatch.index : markdown.length;

    const content = markdown
      .substring(startIndex, endIndex)
      .trim()
      .replace(/^#+\s*/gm, ''); // Remove any markdown headers from content

    messages.push({ role, content, timestamp });
  }

  return {
    id,
    title,
    messages,
    createdAt: createdMatch?.[1] || new Date().toISOString(),
    updatedAt: updatedMatch?.[1] || new Date().toISOString(),
    sessionId: sessionMatch?.[1] || id,
  };
}

/**
 * Create a new conversation
 */
export async function createConversation(firstMessage: string): Promise<Conversation> {
  const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const title = generateTitle(firstMessage);
  const now = new Date().toISOString();

  const conversation: Conversation = {
    id,
    title,
    messages: [
      {
        role: 'user',
        content: firstMessage,
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    sessionId: id, // Use conversation ID as Raindrop session ID
  };

  await saveConversation(conversation);
  return conversation;
}

/**
 * Save conversation to basic-memory and Raindrop
 */
export async function saveConversation(conversation: Conversation): Promise<void> {
  try {
    // 1. Save to basic-memory as markdown entity
    const basicMemory = await getBasicMemoryClient();
    const markdown = conversationToMarkdown(conversation);

    await basicMemory.createEntity({
      name: `conversations/${conversation.id}`,
      content: markdown,
      tags: ['conversation', 'chat'],
      metadata: {
        conversationId: conversation.id,
        title: conversation.title,
        messageCount: conversation.messages.length,
        lastMessage: conversation.messages[conversation.messages.length - 1]?.content.substring(0, 100),
      },
    });

    // 2. Sync to Raindrop working memory
    const raindrop = getRaindropClient();
    for (const msg of conversation.messages) {
      await raindrop.storeMemory(
        conversation.sessionId,
        `${msg.role}: ${msg.content}`,
        {
          role: msg.role,
          timestamp: msg.timestamp,
          conversationId: conversation.id,
        }
      );
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

/**
 * Add message to existing conversation
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Conversation> {
  const conversation = await getConversation(conversationId);

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });
  conversation.updatedAt = new Date().toISOString();

  await saveConversation(conversation);
  return conversation;
}

/**
 * Get conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const basicMemory = await getBasicMemoryClient();
    const entity = await basicMemory.getEntity(`conversations/${id}`);

    if (!entity) {
      return null;
    }

    return markdownToConversation(entity.content, id);
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

/**
 * List all conversations
 */
export async function listConversations(): Promise<Conversation[]> {
  try {
    const basicMemory = await getBasicMemoryClient();
    const results = await basicMemory.search({
      query: 'tag:conversation',
      limit: 100,
    });

    const conversations: Conversation[] = [];

    for (const result of results) {
      if (result.content && result.path) {
        const id = result.path.replace('conversations/', '').replace('.md', '');
        const conv = markdownToConversation(result.content, id);
        conversations.push(conv);
      }
    }

    // Sort by updatedAt (most recent first)
    conversations.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return conversations;
  } catch (error) {
    console.error('Error listing conversations:', error);
    return [];
  }
}

/**
 * Delete conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    const basicMemory = await getBasicMemoryClient();
    await basicMemory.deleteEntity(`conversations/${id}`);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}
