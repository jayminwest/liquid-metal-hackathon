/**
 * Tool Builder Agent
 * Uses Claude Code SDK to generate MCP tools from natural language
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  TOOL_BUILDER_SYSTEM_PROMPT,
  TOOL_ANALYSIS_PROMPT,
  CODE_GENERATION_PROMPT,
} from './agentPrompts';

export interface ToolAnalysis {
  service: string;
  toolName: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  authentication: {
    method: 'oauth2' | 'apikey' | 'bearer';
    provider?: string;
    scopes?: string[];
    authUrl?: string;
    tokenUrl?: string;
  };
}

export interface GeneratedTool {
  toolId: string;
  handlerCode: string;
  serverCode: string;
  toolDefinition: {
    name: string;
    description: string;
    inputSchema: any;
  };
  oauthConfig?: {
    provider: string;
    scopes: string[];
    authUrl: string;
    tokenUrl: string;
  };
  dependencies: string[];
}

/**
 * Tool Builder Agent
 * Uses Claude SDK to analyze requests and generate MCP tools
 */
export class ToolBuilderAgent {
  private anthropic: Anthropic;

  constructor(apiKey?: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Analyze user request using Claude to determine tool requirements
   */
  async analyzeRequest(userRequest: string, context?: string): Promise<ToolAnalysis> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: TOOL_BUILDER_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: TOOL_ANALYSIS_PROMPT(userRequest, context),
          },
        ],
      });

      // Extract JSON from response
      const firstContent = message.content[0];
      const responseText = firstContent && firstContent.type === 'text' ? firstContent.text : '';
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error('Failed to extract JSON from analysis response');
      }

      const analysis = JSON.parse(jsonMatch[1]);
      return analysis as ToolAnalysis;
    } catch (error: any) {
      console.error('[ToolBuilderAgent] Analysis failed:', error);
      // Fallback to pattern matching
      return this.fallbackAnalysis(userRequest);
    }
  }

  /**
   * Generate tool code using Claude
   */
  async generateTool(analysis: ToolAnalysis): Promise<GeneratedTool> {
    try {
      const toolId = `${analysis.service}-${analysis.toolName}-${Date.now()}`;

      const message = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: TOOL_BUILDER_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: CODE_GENERATION_PROMPT(analysis),
          },
        ],
      });

      // Extract JSON from response
      const firstContent = message.content[0];
      const responseText = firstContent && firstContent.type === 'text' ? firstContent.text : '';
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error('Failed to extract JSON from code generation response');
      }

      const generated = JSON.parse(jsonMatch[1]);

      return {
        toolId,
        handlerCode: generated.handlerCode,
        serverCode: generated.serverCode,
        toolDefinition: generated.toolDefinition,
        oauthConfig: analysis.authentication.provider
          ? {
              provider: analysis.authentication.provider,
              scopes: analysis.authentication.scopes || [],
              authUrl: analysis.authentication.authUrl || '',
              tokenUrl: analysis.authentication.tokenUrl || '',
            }
          : undefined,
        dependencies: generated.dependencies || [],
      };
    } catch (error: any) {
      console.error('[ToolBuilderAgent] Code generation failed:', error);
      // Fallback to template
      return this.fallbackGeneration(analysis);
    }
  }

  /**
   * Fallback analysis using pattern matching
   */
  private fallbackAnalysis(userRequest: string): ToolAnalysis {
    const requestLower = userRequest.toLowerCase();

    if (requestLower.includes('slack')) {
      return this.analyzeSlackRequest(userRequest);
    } else if (requestLower.includes('github')) {
      return this.analyzeGitHubRequest(userRequest);
    } else {
      return {
        service: 'generic',
        toolName: 'custom-tool',
        description: userRequest,
        parameters: {
          input: {
            type: 'string',
            description: 'Input parameter',
            required: true,
          },
        },
        authentication: {
          method: 'apikey',
        },
      };
    }
  }

  /**
   * Fallback code generation using templates
   */
  private fallbackGeneration(analysis: ToolAnalysis): GeneratedTool {
    const toolId = `${analysis.service}-${analysis.toolName}-${Date.now()}`;

    if (analysis.service === 'slack') {
      return this.generateSlackTool(toolId, analysis);
    } else {
      return this.generateGenericTool(toolId, analysis);
    }
  }

  // Service-specific analyzers
  private analyzeSlackRequest(request: string): ToolAnalysis {
    const isRead = request.match(/read|get|fetch|list/i);
    const isWrite = request.match(/send|post|create|write/i);

    if (isRead) {
      return {
        service: 'slack',
        toolName: 'read-messages',
        description: 'Read messages from a Slack channel',
        parameters: {
          channel: {
            type: 'string',
            description: 'Channel ID or name (e.g., #general)',
            required: true,
          },
          limit: {
            type: 'number',
            description: 'Maximum number of messages to retrieve',
            required: false,
          },
        },
        authentication: {
          method: 'oauth2',
          provider: 'slack',
          scopes: ['channels:read', 'channels:history'],
          authUrl: 'https://slack.com/oauth/v2/authorize',
          tokenUrl: 'https://slack.com/api/oauth.v2.access',
        },
      };
    } else if (isWrite) {
      return {
        service: 'slack',
        toolName: 'send-message',
        description: 'Send a message to a Slack channel',
        parameters: {
          channel: {
            type: 'string',
            description: 'Channel ID or name',
            required: true,
          },
          text: {
            type: 'string',
            description: 'Message text',
            required: true,
          },
        },
        authentication: {
          method: 'oauth2',
          provider: 'slack',
          scopes: ['chat:write'],
          authUrl: 'https://slack.com/oauth/v2/authorize',
          tokenUrl: 'https://slack.com/api/oauth.v2.access',
        },
      };
    }

    // Default to read
    return this.analyzeSlackRequest('read slack channels');
  }

  private analyzeGitHubRequest(_request: string): ToolAnalysis {
    return {
      service: 'github',
      toolName: 'create-issue',
      description: 'Create an issue in a GitHub repository',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true },
        title: { type: 'string', description: 'Issue title', required: true },
        body: { type: 'string', description: 'Issue description', required: false },
      },
      authentication: {
        method: 'oauth2',
        provider: 'github',
        scopes: ['repo'],
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
      },
    };
  }

  // Future expansion: Add Email-specific request analysis
  // private analyzeEmailRequest(_request: string): ToolAnalysis {
  //   return {
  //     service: 'email',
  //     toolName: 'send-email',
  //     description: 'Send an email via Gmail',
  //     parameters: {
  //       to: { type: 'string', description: 'Recipient email', required: true },
  //       subject: { type: 'string', description: 'Email subject', required: true },
  //       body: { type: 'string', description: 'Email body', required: true },
  //     },
  //     authentication: {
  //       method: 'oauth2',
  //       provider: 'google',
  //       scopes: ['https://www.googleapis.com/auth/gmail.send'],
  //       authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  //       tokenUrl: 'https://oauth2.googleapis.com/token',
  //     },
  //   };
  // }

  // Template generators (returning minimal working code)
  private generateSlackTool(toolId: string, analysis: ToolAnalysis): GeneratedTool {
    const handlerCode = `
async function handleReadMessages(args: any, credentials: any) {
  const { channel, limit = 10 } = args;

  if (!credentials.slackAccessToken) {
    throw new Error('Slack access token not found. Please complete OAuth flow.');
  }

  // For hackathon: Return mock data
  // Production: Use @slack/web-api
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        channel,
        messages: [
          { user: 'U123', text: 'Hello!', ts: '1234567890.123456' },
          { user: 'U456', text: 'World!', ts: '1234567891.123456' },
        ],
        message: 'MOCK DATA - OAuth not yet configured'
      }, null, 2),
    }],
  };
}`;

    return {
      toolId,
      handlerCode,
      serverCode: this.wrapInMCPServer('slack-tools', '1.0.0', [
        {
          name: analysis.toolName,
          handler: 'handleReadMessages',
          description: analysis.description,
          parameters: analysis.parameters,
        },
      ]),
      toolDefinition: {
        name: analysis.toolName,
        description: analysis.description,
        inputSchema: {
          type: 'object',
          properties: analysis.parameters,
          required: Object.entries(analysis.parameters)
            .filter(([_, p]) => p.required)
            .map(([name]) => name),
        },
      },
      oauthConfig: analysis.authentication.provider
        ? {
            provider: analysis.authentication.provider,
            scopes: analysis.authentication.scopes || [],
            authUrl: analysis.authentication.authUrl || '',
            tokenUrl: analysis.authentication.tokenUrl || '',
          }
        : undefined,
      dependencies: ['@slack/web-api@^7.0.0'],
    };
  }

  // Future expansion: Add GitHub-specific tool generation
  // private generateGitHubTool(toolId: string, analysis: ToolAnalysis): GeneratedTool {
  //   return this.generateGenericTool(toolId, analysis);
  // }

  // Future expansion: Add Email-specific tool generation
  // private generateEmailTool(toolId: string, analysis: ToolAnalysis): GeneratedTool {
  //   return this.generateGenericTool(toolId, analysis);
  // }

  private generateGenericTool(toolId: string, analysis: ToolAnalysis): GeneratedTool {
    const handlerName = this.toHandlerName(analysis.toolName);
    const handlerCode = `
async function ${handlerName}(args: any, credentials: any) {
  // HACKATHON: Template-generated tool
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        tool: '${analysis.toolName}',
        service: '${analysis.service}',
        parameters: args,
        message: 'Tool executed successfully (mock)',
      }, null, 2),
    }],
  };
}`;

    return {
      toolId,
      handlerCode,
      serverCode: this.wrapInMCPServer(`${analysis.service}-tools`, '1.0.0', [
        {
          name: analysis.toolName,
          handler: handlerName,
          description: analysis.description,
          parameters: analysis.parameters,
        },
      ]),
      toolDefinition: {
        name: analysis.toolName,
        description: analysis.description,
        inputSchema: {
          type: 'object',
          properties: analysis.parameters,
          required: Object.entries(analysis.parameters)
            .filter(([_, p]) => p.required)
            .map(([name]) => name),
        },
      },
      oauthConfig: analysis.authentication.provider
        ? {
            provider: analysis.authentication.provider,
            scopes: analysis.authentication.scopes || [],
            authUrl: analysis.authentication.authUrl || '',
            tokenUrl: analysis.authentication.tokenUrl || '',
          }
        : undefined,
      dependencies: [],
    };
  }

  private toHandlerName(toolName: string): string {
    return (
      'handle' +
      toolName
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('')
    );
  }

  private wrapInMCPServer(serverName: string, version: string, tools: any[]): string {
    // Note: handlers list not currently used but kept for future reference
    // const handlers = tools.map((t) => t.handler).join(', ');
    const toolDefs = tools
      .map(
        (t) => `      {
        name: '${t.name}',
        description: '${t.description}',
        inputSchema: {
          type: 'object',
          properties: ${JSON.stringify(t.parameters, null, 10)},
        },
      }`
      )
      .join(',\n');

    const switchCases = tools
      .map(
        (t) => `      case '${t.name}':
        return await ${t.handler}(args, credentials);`
      )
      .join('\n');

    return `// MCP Server: ${serverName}
// Generated by Tool Builder Agent

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Load credentials
function loadCredentials() {
  return {}; // Loaded from storage
}

const credentials = loadCredentials();

// Tool handlers (defined elsewhere)

// Server setup
const server = new Server(
  { name: '${serverName}', version: '${version}' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
${toolDefs}
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
${switchCases}
    default:
      throw new Error(\`Unknown tool: \${name}\`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
`;
  }
}
