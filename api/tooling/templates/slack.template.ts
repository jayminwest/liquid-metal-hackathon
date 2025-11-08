/**
 * Slack Integration Template
 * Reference implementation for agent to learn from
 */

export const SLACK_TEMPLATE = `
import { WebClient } from '@slack/web-api';

// Slack tool: read-messages
async function handleReadMessages(args: any, credentials: any) {
  const { channel, limit = 10 } = args;

  if (!credentials.slackAccessToken) {
    throw new Error('Slack OAuth not completed');
  }

  const client = new WebClient(credentials.slackAccessToken);

  try {
    // Resolve channel name to ID if needed
    let channelId = channel;
    if (channel.startsWith('#')) {
      const conversations = await client.conversations.list();
      const found = conversations.channels?.find((c: any) => c.name === channel.slice(1));
      if (found) {
        channelId = found.id;
      }
    }

    const result = await client.conversations.history({
      channel: channelId,
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

// Slack tool: send-message
async function handleSendMessage(args: any, credentials: any) {
  const { channel, text } = args;

  if (!credentials.slackAccessToken) {
    throw new Error('Slack OAuth not completed');
  }

  const client = new WebClient(credentials.slackAccessToken);

  try {
    const result = await client.chat.postMessage({
      channel,
      text,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true, ts: result.ts }, null, 2),
      }],
    };
  } catch (error: any) {
    throw new Error(\`Slack API error: \${error.message}\`);
  }
}
`;
