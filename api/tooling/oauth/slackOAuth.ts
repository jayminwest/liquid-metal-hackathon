/**
 * Slack OAuth Handler
 */

export interface SlackOAuthTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeSlackCode(code: string): Promise<{
  accessToken: string;
  scope: string;
  teamId?: string;
}> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/tools/oauth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Slack OAuth credentials not configured');
  }

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await response.json()) as SlackOAuthTokenResponse;

  if (!data.ok) {
    throw new Error('Slack OAuth token exchange failed');
  }

  return {
    accessToken: data.access_token,
    scope: data.scope,
    teamId: data.team?.id,
  };
}
