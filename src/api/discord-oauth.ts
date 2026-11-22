// Discord OAuth2
// Scopes : identify (profil) + guilds (serveurs) + guilds.members.read

import { launchOAuth, OAuthResult } from './oauth';
import { getDiscordGuilds } from './discord';

// ⚠️  Client ID à récupérer sur https://discord.com/developers/applications
// Stocké ici en constante pour le dev — en prod, utiliser EAS Secrets
const DISCORD_CLIENT_ID = '1572651733640028261';

export const DISCORD_OAUTH_CONFIG = {
  clientId: DISCORD_CLIENT_ID,
  authorizationEndpoint: 'https://discord.com/oauth2/authorize',
  tokenEndpoint: 'https://discord.com/api/oauth2/token',
  scopes: ['identify', 'guilds', 'guilds.members.read'],
  redirectUri: 'https://becher.github.io/cleanly-app/oauth/',
  appScheme: 'cleanly://oauth',
  responseType: 'token' as const,
};

export function getDiscordAuthUrl(): string {
  const scopeParam = encodeURIComponent(DISCORD_OAUTH_CONFIG.scopes.join(' '));
  return `${DISCORD_OAUTH_CONFIG.authorizationEndpoint}?response_type=${DISCORD_OAUTH_CONFIG.responseType}&client_id=${DISCORD_OAUTH_CONFIG.clientId}&scope=${scopeParam}&redirect_uri=${encodeURIComponent(DISCORD_OAUTH_CONFIG.redirectUri)}`;
}

export type DiscordUserProfile = {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
};

/**
 * Lance le flow OAuth Discord complet (InAppBrowser)
 */
export async function connectDiscord(): Promise<{
  token: OAuthResult;
  profile: DiscordUserProfile;
}> {
  // 1. OAuth → access token
  const token = await launchOAuth(DISCORD_OAUTH_CONFIG);

  // 2. Récupérer le profil Discord
  const profile = await fetchDiscordProfile(token.accessToken);

  return { token, profile };
}

/**
 * Récupère le profil de l'utilisateur connecté
 */
export async function fetchDiscordProfile(accessToken: string): Promise<DiscordUserProfile> {
  const authHeader = accessToken.startsWith('Bearer ') || accessToken.startsWith('Bot ')
    ? accessToken
    : accessToken;

  const response = await fetch('https://discord.com/api/v9/users/@me', {
    headers: {
      Authorization: authHeader,
      'User-Agent': 'Discord-Android/867',
    },
  });

  if (!response.ok) {
    throw new Error(`Discord profile fetch failed: ${response.status}`);
  }

  return response.json() as Promise<DiscordUserProfile>;
}

/**
 * URL d'avatar Discord
 */
export function getDiscordAvatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    // Avatar par défaut Discord (basé sur discriminator)
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
}

