/**
 * AI Service - GPT-5 (gpt-4o) with hybrid retrieval and MCP integration
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { getBasicMemoryClient } from './basicMemory';
import { getRaindropClient } from './raindrop';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * Hybrid retrieval: Search both basic-memory and Raindrop
 */
export async function hybridRetrieval(query: string, sessionId: string): Promise<string> {
  const results: string[] = [];

  try {
    // 1. Search basic-memory (local graph)
    const basicMemory = await getBasicMemoryClient();
    const localResults = await basicMemory.search({
      query,
      limit: 5,
    });

    if (localResults && localResults.length > 0) {
      results.push('## Local Knowledge (basic-memory):\n');
      for (const result of localResults) {
        results.push(`- ${result.path || result.name}: ${result.content?.substring(0, 200)}...`);
      }
    }

    // 2. Search Raindrop (semantic/cloud)
    const raindrop = getRaindropClient();
    const cloudResults = await raindrop.searchMemory(sessionId, query, 5);

    if (cloudResults && cloudResults.length > 0) {
      results.push('\n## Cloud Knowledge (Raindrop):\n');
      for (const result of cloudResults) {
        results.push(`- ${result.content?.substring(0, 200)}...`);
      }
    }

    if (results.length === 0) {
      return 'No relevant knowledge found in local or cloud storage.';
    }

    return results.join('\n');
  } catch (error) {
    console.error('Hybrid retrieval error:', error);
    return 'Error retrieving knowledge context.';
  }
}

/**
 * Basic-memory MCP tools exposed to GPT-5
 */
const basicMemoryTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Search the knowledge base (both local and cloud) for relevant information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query or question',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_entity',
      description: 'Read a specific entity from the knowledge graph by name',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The entity name or file path to read',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_entity',
      description: 'Create a new entity in the knowledge graph',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The entity name',
          },
          content: {
            type: 'string',
            description: 'The entity content in markdown format',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags for the entity',
          },
        },
        required: ['name', 'content'],
      },
    },
  },
];

/**
 * Execute basic-memory tool calls
 */
async function executeToolCall(
  toolName: string,
  args: any,
  sessionId: string
): Promise<string> {
  try {
    const basicMemory = await getBasicMemoryClient();

    switch (toolName) {
      case 'search_knowledge':
        return await hybridRetrieval(args.query, sessionId);

      case 'read_entity':
        const entity = await basicMemory.getEntity(args.name);
        return entity ? entity.content : `Entity "${args.name}" not found`;

      case 'create_entity':
        await basicMemory.createEntity({
          name: args.name,
          content: args.content,
          tags: args.tags || [],
        });
        return `Created entity "${args.name}"`;

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Chat with GPT-5 using hybrid retrieval and MCP tools
 */
export async function chat(
  messages: ChatCompletionMessageParam[],
  sessionId: string
): Promise<string> {
  try {
    // First, do hybrid retrieval for the latest user message
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    let context = '';

    if (lastUserMessage && typeof lastUserMessage.content === 'string') {
      context = await hybridRetrieval(lastUserMessage.content, sessionId);
    }

    // Build system message with context
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: `You are a helpful AI assistant with access to a personal knowledge base.

${context ? `Here is relevant context from the knowledge base:\n${context}\n\n` : ''}

You have access to tools to search, read, and create knowledge entities. Use them when helpful.

Always provide accurate, well-reasoned responses based on the available knowledge.`,
    };

    // Call GPT-5 with tools
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [systemMessage, ...messages],
      tools: basicMemoryTools,
      tool_choice: 'auto',
    });

    const assistantMessage = response.choices[0].message;

    // Handle tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolMessages: ChatCompletionMessageParam[] = [];

      // Execute all tool calls
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeToolCall(toolCall.function.name, args, sessionId);

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Get final response with tool results
      const finalResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          systemMessage,
          ...messages,
          assistantMessage,
          ...toolMessages,
        ],
      });

      return finalResponse.choices[0].message.content || 'No response generated';
    }

    return assistantMessage.content || 'No response generated';
  } catch (error) {
    console.error('Chat error:', error);
    throw new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
