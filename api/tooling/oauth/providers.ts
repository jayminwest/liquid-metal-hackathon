/**
 * OAuth Provider Configurations
 */

export interface OAuthProvider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  defaultScopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  slack: {
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    defaultScopes: ['channels:read', 'channels:history', 'chat:write'],
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET',
  },

  github: {
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    defaultScopes: ['repo', 'read:user'],
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
  },

  google: {
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    defaultScopes: ['https://www.googleapis.com/auth/gmail.send'],
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
};

export function getProvider(providerName: string): OAuthProvider | null {
  return OAUTH_PROVIDERS[providerName.toLowerCase()] || null;
}
