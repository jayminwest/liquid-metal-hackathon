/**
 * Base MCP server template
 * Provides the structure for dynamically generated MCP servers
 */

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
    required?: string[];
  };
}

export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPToolDefinition[];
}

/**
 * Generate base MCP server code structure
 * This template is used as a reference for the agent to generate compliant MCP servers
 */
export const BASE_MCP_SERVER_TEMPLATE = `
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Server: {{SERVER_NAME}}
 * Version: {{SERVER_VERSION}}
 * Generated: {{GENERATED_DATE}}
 *
 * This server provides the following tools:
{{TOOLS_DESCRIPTION}}
 */

// Tool handlers
{{TOOL_HANDLERS}}

// Server setup
const server = new Server(
  {
    name: '{{SERVER_NAME}}',
    version: '{{SERVER_VERSION}}',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
{{TOOLS_LIST}}
    ],
  };
});

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
{{TOOL_SWITCH_CASES}}
      default:
        throw new Error(\`Unknown tool: \${name}\`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: \`Error: \${error.message}\`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
`;

/**
 * Tool handler template
 */
export const TOOL_HANDLER_TEMPLATE = `
/**
 * Handler for {{TOOL_NAME}}
 * {{TOOL_DESCRIPTION}}
 */
async function handle{{TOOL_NAME_PASCAL}}(args: any, credentials: any) {
  // Validate required parameters
{{PARAMETER_VALIDATION}}

  // Execute tool logic
{{TOOL_LOGIC}}

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
`;

/**
 * Tool definition template for tools list
 */
export const TOOL_DEFINITION_TEMPLATE = `      {
        name: '{{TOOL_NAME}}',
        description: '{{TOOL_DESCRIPTION}}',
        inputSchema: {
          type: 'object',
          properties: {
{{TOOL_PROPERTIES}}
          },
          required: [{{TOOL_REQUIRED}}],
        },
      }`;

/**
 * Tool switch case template
 */
export const TOOL_SWITCH_CASE_TEMPLATE = `      case '{{TOOL_NAME}}':
        return await handle{{TOOL_NAME_PASCAL}}(args, credentials);`;

/**
 * Credentials loading template
 */
export const CREDENTIALS_TEMPLATE = `
// Load credentials from storage
import { readFileSync } from 'fs';
import { join } from 'path';

function loadCredentials() {
  try {
    const credsPath = join(__dirname, 'credentials.json');
    const credsData = readFileSync(credsPath, 'utf-8');
    return JSON.parse(credsData);
  } catch (error) {
    console.error('Failed to load credentials:', error);
    return {};
  }
}

const credentials = loadCredentials();
`;

/**
 * Helper to convert snake_case to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Helper to generate tool properties schema
 */
export function generateToolProperties(
  properties: Record<string, { type: string; description: string; required?: boolean }>
): string {
  return Object.entries(properties)
    .map(
      ([key, prop]) => `            ${key}: {
              type: '${prop.type}',
              description: '${prop.description}',
            }`
    )
    .join(',\n');
}

/**
 * Helper to generate required fields array
 */
export function generateRequiredFields(
  properties: Record<string, { type: string; description: string; required?: boolean }>
): string {
  const required = Object.entries(properties)
    .filter(([_, prop]) => prop.required)
    .map(([key]) => `'${key}'`);
  return required.join(', ');
}

/**
 * Generate complete MCP server code from config
 */
export function generateMCPServer(config: MCPServerConfig): string {
  let serverCode = BASE_MCP_SERVER_TEMPLATE;

  // Replace server metadata
  serverCode = serverCode.replace(/{{SERVER_NAME}}/g, config.name);
  serverCode = serverCode.replace(/{{SERVER_VERSION}}/g, config.version);
  serverCode = serverCode.replace(/{{GENERATED_DATE}}/g, new Date().toISOString());

  // Generate tools description
  const toolsDescription = config.tools
    .map((tool) => ` * - ${tool.name}: ${tool.description}`)
    .join('\n');
  serverCode = serverCode.replace('{{TOOLS_DESCRIPTION}}', toolsDescription);

  // Generate tool handlers (placeholders - agent will fill in logic)
  const toolHandlers = config.tools
    .map((tool) => {
      let handler = TOOL_HANDLER_TEMPLATE;
      handler = handler.replace(/{{TOOL_NAME}}/g, tool.name);
      handler = handler.replace(/{{TOOL_NAME_PASCAL}}/g, toPascalCase(tool.name));
      handler = handler.replace('{{TOOL_DESCRIPTION}}', tool.description);
      handler = handler.replace('{{PARAMETER_VALIDATION}}', '  // TODO: Add parameter validation');
      handler = handler.replace('{{TOOL_LOGIC}}', '  // TODO: Implement tool logic\n  const result = {};');
      return handler;
    })
    .join('\n\n');
  serverCode = serverCode.replace('{{TOOL_HANDLERS}}', toolHandlers);

  // Generate tools list
  const toolsList = config.tools
    .map((tool) => {
      let toolDef = TOOL_DEFINITION_TEMPLATE;
      toolDef = toolDef.replace(/{{TOOL_NAME}}/g, tool.name);
      toolDef = toolDef.replace('{{TOOL_DESCRIPTION}}', tool.description);
      toolDef = toolDef.replace('{{TOOL_PROPERTIES}}', generateToolProperties(tool.inputSchema.properties));
      toolDef = toolDef.replace('{{TOOL_REQUIRED}}', generateRequiredFields(tool.inputSchema.properties));
      return toolDef;
    })
    .join(',\n');
  serverCode = serverCode.replace('{{TOOLS_LIST}}', toolsList);

  // Generate switch cases
  const switchCases = config.tools
    .map((tool) => {
      let switchCase = TOOL_SWITCH_CASE_TEMPLATE;
      switchCase = switchCase.replace(/{{TOOL_NAME}}/g, tool.name);
      switchCase = switchCase.replace(/{{TOOL_NAME_PASCAL}}/g, toPascalCase(tool.name));
      return switchCase;
    })
    .join('\n');
  serverCode = serverCode.replace('{{TOOL_SWITCH_CASES}}', switchCases);

  // Add credentials loading
  serverCode = CREDENTIALS_TEMPLATE + '\n' + serverCode;

  return serverCode;
}

/**
 * Example usage:
 *
 * const config: MCPServerConfig = {
 *   name: 'slack-tools',
 *   version: '1.0.0',
 *   tools: [
 *     {
 *       name: 'read-channel',
 *       description: 'Read messages from a Slack channel',
 *       inputSchema: {
 *         type: 'object',
 *         properties: {
 *           channel: {
 *             type: 'string',
 *             description: 'Channel ID or name',
 *             required: true,
 *           },
 *           limit: {
 *             type: 'number',
 *             description: 'Number of messages to retrieve',
 *             required: false,
 *           },
 *         },
 *       },
 *     },
 *   ],
 * };
 *
 * const serverCode = generateMCPServer(config);
 */
