/**
 * Tool Merger
 * Merges new tools into existing user MCP servers
 */

import type { MCPToolDefinition } from '../templates/base.template';

export interface ExistingMCPServer {
  code: string;
  metadata: {
    tools: string[]; // List of tool names already in the server
    version: string;
    lastUpdated: string;
  };
}

export interface NewTool {
  toolId: string;
  toolName: string;
  handlerCode: string; // The function implementation
  toolDefinition: MCPToolDefinition;
}

/**
 * Merge a new tool into an existing MCP server
 * Returns updated server code and metadata
 */
export async function mergeToolIntoServer(
  existingServer: ExistingMCPServer | null,
  newTool: NewTool
): Promise<{
  updatedCode: string;
  updatedMetadata: {
    tools: string[];
    version: string;
    lastUpdated: string;
  };
}> {
  // If no existing server, this will be handled by the MCP builder
  // which will generate a complete new server
  if (!existingServer) {
    throw new Error('Cannot merge into non-existent server. Use MCP builder to create initial server.');
  }

  const { code, metadata } = existingServer;
  const { toolName, handlerCode, toolDefinition } = newTool;

  // Check if tool already exists
  if (metadata.tools.includes(toolName)) {
    throw new Error(`Tool '${toolName}' already exists in server. Remove it first or use update.`);
  }

  // Extract server structure components
  let updatedCode = code;

  // 1. Add the new tool handler before the server setup
  const serverSetupMarker = '// Server setup';
  const serverSetupIndex = updatedCode.indexOf(serverSetupMarker);
  if (serverSetupIndex === -1) {
    throw new Error('Invalid server structure: missing server setup marker');
  }

  updatedCode =
    updatedCode.slice(0, serverSetupIndex) +
    handlerCode +
    '\n\n' +
    updatedCode.slice(serverSetupIndex);

  // 2. Add tool to tools list in ListToolsRequestSchema handler
  const toolsListEndMarker = '    ],\n  };\n});';
  const toolsListEndIndex = updatedCode.indexOf(toolsListEndMarker);
  if (toolsListEndIndex === -1) {
    throw new Error('Invalid server structure: missing tools list end marker');
  }

  const toolDefinitionString = generateToolDefinitionString(toolDefinition);
  const hasExistingTools = metadata.tools.length > 0;
  const toolsListInsertion = hasExistingTools
    ? `,\n${toolDefinitionString}`
    : `\n${toolDefinitionString}`;

  updatedCode =
    updatedCode.slice(0, toolsListEndIndex) +
    toolsListInsertion +
    updatedCode.slice(toolsListEndIndex);

  // 3. Add case to switch statement in CallToolRequestSchema handler
  const switchDefaultMarker = '      default:';
  const switchDefaultIndex = updatedCode.indexOf(switchDefaultMarker);
  if (switchDefaultIndex === -1) {
    throw new Error('Invalid server structure: missing switch default marker');
  }

  const pascalCaseName = toPascalCase(toolName);
  const switchCase = `      case '${toolName}':\n        return await handle${pascalCaseName}(args, credentials);\n\n`;

  updatedCode =
    updatedCode.slice(0, switchDefaultIndex) +
    switchCase +
    updatedCode.slice(switchDefaultIndex);

  // 4. Update metadata
  const updatedMetadata = {
    tools: [...metadata.tools, toolName],
    version: incrementVersion(metadata.version),
    lastUpdated: new Date().toISOString(),
  };

  return {
    updatedCode,
    updatedMetadata,
  };
}

/**
 * Remove a tool from an existing MCP server
 */
export async function removeToolFromServer(
  existingServer: ExistingMCPServer,
  toolName: string
): Promise<{
  updatedCode: string;
  updatedMetadata: {
    tools: string[];
    version: string;
    lastUpdated: string;
  };
}> {
  const { code, metadata } = existingServer;

  if (!metadata.tools.includes(toolName)) {
    throw new Error(`Tool '${toolName}' not found in server`);
  }

  let updatedCode = code;
  const pascalCaseName = toPascalCase(toolName);

  // 1. Remove tool handler function
  const handlerStart = `async function handle${pascalCaseName}(`;
  const handlerStartIndex = updatedCode.indexOf(handlerStart);
  if (handlerStartIndex !== -1) {
    // Find the end of the function (next function or server setup)
    const nextFunctionIndex = updatedCode.indexOf('async function handle', handlerStartIndex + 1);
    const serverSetupIndex = updatedCode.indexOf('// Server setup');
    const handlerEndIndex = nextFunctionIndex !== -1 && nextFunctionIndex < serverSetupIndex
      ? nextFunctionIndex
      : serverSetupIndex;

    updatedCode =
      updatedCode.slice(0, handlerStartIndex) +
      updatedCode.slice(handlerEndIndex);
  }

  // 2. Remove tool from tools list
  // This is complex because we need to handle comma placement
  // For simplicity, we'll rebuild the entire tools list
  // (A more robust solution would parse the AST)
  const toolDefStart = new RegExp(`\\{\\s*name:\\s*'${toolName}'[\\s\\S]*?\\}`, 'g');
  updatedCode = updatedCode.replace(toolDefStart, '');

  // Clean up any double commas or trailing commas
  updatedCode = updatedCode.replace(/,\s*,/g, ',');
  updatedCode = updatedCode.replace(/,(\s*])/g, '$1');

  // 3. Remove switch case
  const switchCasePattern = new RegExp(
    `\\s*case '${toolName}':[\\s\\S]*?return await handle${pascalCaseName}\\(args, credentials\\);\\n`,
    'g'
  );
  updatedCode = updatedCode.replace(switchCasePattern, '');

  // 4. Update metadata
  const updatedMetadata = {
    tools: metadata.tools.filter((t) => t !== toolName),
    version: incrementVersion(metadata.version),
    lastUpdated: new Date().toISOString(),
  };

  return {
    updatedCode,
    updatedMetadata,
  };
}

/**
 * Helper: Generate tool definition string for insertion
 */
function generateToolDefinitionString(toolDef: MCPToolDefinition): string {
  const properties = Object.entries(toolDef.inputSchema.properties)
    .map(
      ([key, prop]) => `            ${key}: {
              type: '${prop.type}',
              description: '${prop.description}',
            }`
    )
    .join(',\n');

  const required = Object.entries(toolDef.inputSchema.properties)
    .filter(([_, prop]) => prop.required)
    .map(([key]) => `'${key}'`)
    .join(', ');

  return `      {
        name: '${toolDef.name}',
        description: '${toolDef.description}',
        inputSchema: {
          type: 'object',
          properties: {
${properties}
          },
          required: [${required}],
        },
      }`;
}

/**
 * Helper: Convert snake_case or kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Helper: Increment semver version (patch level)
 */
function incrementVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length !== 3) return '1.0.1';

  const [major, minor, patch] = parts;
  return `${major}.${minor}.${parseInt(patch, 10) + 1}`;
}

/**
 * Validate MCP server structure
 * Ensures the server has all required components
 */
export function validateServerStructure(code: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for required markers
  if (!code.includes('// Server setup')) {
    errors.push('Missing server setup marker');
  }

  if (!code.includes('server.setRequestHandler(ListToolsRequestSchema')) {
    errors.push('Missing ListToolsRequestSchema handler');
  }

  if (!code.includes('server.setRequestHandler(CallToolRequestSchema')) {
    errors.push('Missing CallToolRequestSchema handler');
  }

  if (!code.includes('function loadCredentials()')) {
    errors.push('Missing credentials loading function');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
