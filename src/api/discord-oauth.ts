// Discord OAuth2
// Scopes : identify (profil) + guilds (serveurs) + guilds.members.read

import { launchOAuth, OAuthResult } from './oauth';
import { getDiscordGuilds } from './discord';

// ⚠️  Client ID à récupérer sur https://discord.com/developers/applications
// Stocké ici en constante pour le dev — en prod, utiliser EAS Secrets
const DISCORD_CLIENT_ID = process.env.EXPO_PUBLIC_DISCORD_CLIENT_ID ?? 'TON_CLIENT_ID_ICI';

const DISCORD_OAUTH_CONFIG = {
  clientId:              DISCORD_CLIENT_ID,
  authorizationEndpoint: 'https://discord.com/oauth2/authorize',
  tokenEndpoint:         'https://discord.com/api/oauth2/token',
  scopes:                ['identify', 'guilds', 'guilds.members.read'],
};

export type DiscordUserProfile = {
  id:            string;
  username:      string;
  discriminator: string;
  avatar:        string | null;
  global_name:   string | null;
};

/**
 * Lance le flow OAuth Discord complet
 * Retourne le token + le profil de l'utilisateur
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
async function fetchDiscordProfile(accessToken: string): Promise<DiscordUserProfile> {
  const response = await fetch('https://discord.com/api/v9/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
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
