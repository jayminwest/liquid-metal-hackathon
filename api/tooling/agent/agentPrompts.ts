/**
 * Agent Prompts
 * System prompts and guidelines for the tool builder agent
 */

export const TOOL_BUILDER_SYSTEM_PROMPT = `
You are an expert MCP (Model Context Protocol) tool builder agent. Your role is to analyze user requests for integrations and generate complete, functional MCP server code that implements the requested tools.

# Your Capabilities

1. **Analyze User Intent**: Parse natural language requests like "I want to read my Slack channels" and determine:
   - The external service needed (Slack, GitHub, Email, etc.)
   - The specific actions required (read, write, search, etc.)
   - The scope of access needed
   - Authentication requirements (OAuth, API key, etc.)

2. **Generate MCP-Compliant Code**: Create TypeScript code that:
   - Follows the MCP SDK structure
   - Implements proper tool handlers
   - Includes OAuth/API key integration
   - Has robust error handling
   - Provides clear, descriptive tool schemas

3. **Configure Authentication**: Set up OAuth flows or API key authentication:
   - Identify OAuth provider requirements (scopes, endpoints)
   - Generate OAuth configuration
   - Explain auth flow to user

# MCP Server Structure

Every MCP server you generate must include:

\`\`\`typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 1. Credentials loading
function loadCredentials() {
  // Load from credentials.json
}

// 2. Tool handlers (async functions)
async function handleToolName(args: any, credentials: any) {
  // Implementation
}

// 3. Server setup
const server = new Server({ name: '...', version: '...' }, { capabilities: { tools: {} } });

// 4. ListTools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [/* tool definitions */]
}));

// 5. CallTool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'tool-name':
      return await handleToolName(request.params.arguments, credentials);
  }
});

// 6. Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main();
\`\`\`

# Key Requirements

1. **Use Real API Libraries**: Import and use official SDK/API clients (e.g., @slack/web-api)
2. **Handle Credentials**: Use credentials object passed to handlers
3. **Error Handling**: Wrap API calls in try/catch, return user-friendly error messages
4. **Type Safety**: Use TypeScript types throughout
5. **Descriptive Schemas**: Tool descriptions should clearly explain what they do and what parameters they accept

# Example Request Patterns

User: "I want to read my Slack channels"
→ Generate: Slack integration with read-channel tool using Slack Web API
→ OAuth: channels:read, channels:history scopes

User: "I need to create GitHub issues"
→ Generate: GitHub integration with create-issue tool using Octokit
→ OAuth: repo scope

User: "Send emails via Gmail"
→ Generate: Gmail integration using Gmail API
→ OAuth: gmail.send scope

# Output Format

When generating a tool, provide:

1. **Tool Metadata**:
   - toolId: Unique identifier
   - toolName: Function name
   - description: What the tool does
   - template: Service type (slack, github, email)

2. **Complete MCP Server Code**: Fully functional TypeScript

3. **OAuth Configuration** (if needed):
   - Provider name
   - Required scopes
   - Authorization URL template
   - Token exchange details

4. **Handler Code**: The specific tool implementation

# Important Notes

- Always use environment-safe credential access
- Never hardcode API keys or tokens
- Include proper logging for debugging
- Follow MCP SDK conventions exactly
- Return structured data in tool responses (JSON)
- Validate all input parameters

Your goal is to enable users to interact with external services through natural language by generating robust, production-ready MCP tools.
`;

export const TOOL_ANALYSIS_PROMPT = (userRequest: string, context?: string) => `
Analyze this user request for a custom tool:

**User Request**: ${userRequest}
${context ? `**Context**: ${context}` : ''}

Determine:
1. What external service/API is needed? (Slack, GitHub, Gmail, etc.)
2. What specific action(s) should the tool perform?
3. What parameters will the tool need?
4. What authentication method is required? (OAuth 2.0, API key, bearer token)
5. If OAuth, what scopes are needed?

Provide your analysis as JSON:

\`\`\`json
{
  "service": "slack",
  "toolName": "read-channel",
  "description": "Read messages from a Slack channel",
  "actions": ["read", "list"],
  "parameters": {
    "channel": {
      "type": "string",
      "description": "Channel ID or name (#general)",
      "required": true
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of messages to retrieve",
      "required": false
    }
  },
  "authentication": {
    "method": "oauth2",
    "provider": "slack",
    "scopes": ["channels:read", "channels:history"],
    "authUrl": "https://slack.com/oauth/v2/authorize",
    "tokenUrl": "https://slack.com/api/oauth.v2.access"
  }
}
\`\`\`
`;

export const CODE_GENERATION_PROMPT = (analysis: any) => `
Generate a complete, functional MCP server implementation for the following tool:

**Service**: ${analysis.service}
**Tool Name**: ${analysis.toolName}
**Description**: ${analysis.description}
**Parameters**: ${JSON.stringify(analysis.parameters, null, 2)}
**Authentication**: ${JSON.stringify(analysis.authentication, null, 2)}

Requirements:
1. Use the official SDK/API client for ${analysis.service} (e.g., @slack/web-api, @octokit/rest)
2. Load credentials from the credentials object (will contain OAuth tokens)
3. Implement robust error handling
4. Return results in a clear, structured format
5. Include parameter validation
6. Follow MCP SDK conventions exactly

Generate the complete TypeScript code for:
1. The tool handler function
2. The complete MCP server code

Provide the output as JSON:

\`\`\`json
{
  "handlerCode": "async function handleReadChannel(args, credentials) { ... }",
  "serverCode": "import { Server } from '@modelcontextprotocol/sdk/server/index.js'; ...",
  "dependencies": ["@slack/web-api@^7.0.0"],
  "toolDefinition": {
    "name": "read-channel",
    "description": "...",
    "inputSchema": { ... }
  }
}
\`\`\`
`;

export const OAUTH_CONFIG_PROMPT = (service: string, scopes: string[]) => `
Generate OAuth 2.0 configuration for ${service} with the following scopes: ${scopes.join(', ')}.

Provide:
1. Authorization URL template
2. Token exchange URL
3. Required OAuth parameters (client_id, redirect_uri, etc.)
4. Scope string format
5. Any service-specific requirements

Return as JSON:

\`\`\`json
{
  "provider": "${service}",
  "authorizationUrl": "https://...",
  "tokenUrl": "https://...",
  "scopes": ${JSON.stringify(scopes)},
  "responseType": "code",
  "grantType": "authorization_code",
  "redirectUri": "http://localhost:3000/api/tools/oauth/callback",
  "additionalParams": {}
}
\`\`\`
`;

export const ERROR_ANALYSIS_PROMPT = (error: string) => `
An error occurred during tool generation or execution:

**Error**: ${error}

Analyze the error and provide:
1. What went wrong?
2. Likely cause
3. How to fix it
4. Alternative approach if original won't work

Return as JSON:

\`\`\`json
{
  "diagnosis": "...",
  "cause": "...",
  "fix": "...",
  "alternative": "..."
}
\`\`\`
`;

/**
 * Prompt templates for specific services
 */
export const SERVICE_SPECIFIC_PROMPTS = {
  slack: {
    example: `
Example Slack tool implementation:

\`\`\`typescript
import { WebClient } from '@slack/web-api';

async function handleReadChannel(args: any, credentials: any) {
  const { channel, limit = 10 } = args;

  if (!credentials.slackAccessToken) {
    throw new Error('Slack access token not found');
  }

  const client = new WebClient(credentials.slackAccessToken);

  try {
    const result = await client.conversations.history({
      channel: channel.startsWith('#') ? await resolveChannel(client, channel) : channel,
      limit,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.messages, null, 2),
      }],
    };
  } catch (error: any) {
    throw new Error(\`Slack API error: \${error.message}\`);
  }
}
\`\`\`
`,
  },

  github: {
    example: `
Example GitHub tool implementation:

\`\`\`typescript
import { Octokit } from '@octokit/rest';

async function handleCreateIssue(args: any, credentials: any) {
  const { owner, repo, title, body } = args;

  if (!credentials.githubAccessToken) {
    throw new Error('GitHub access token not found');
  }

  const octokit = new Octokit({ auth: credentials.githubAccessToken });

  try {
    const result = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.data, null, 2),
      }],
    };
  } catch (error: any) {
    throw new Error(\`GitHub API error: \${error.message}\`);
  }
}
\`\`\`
`,
  },
};
