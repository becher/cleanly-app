// OAuth générique — PKCE avec expo-auth-session
// ⚠️  Ce fichier NE DOIT PAS être importé au top-level
// Utiliser uniquement via require() dynamique dans useConnect.ts

// Ces imports sont OK ici car oauth.ts lui-même n'est chargé que lazily
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Ferme le navigateur automatiquement sur Android
WebBrowser.maybeCompleteAuthSession();

export type OAuthResult = {
  accessToken:   string;
  refreshToken?: string;
  expiresIn?:    number;
  scope?:        string;
};

export type OAuthConfig = {
  clientId:              string;
  authorizationEndpoint: string;
  tokenEndpoint:         string;
  scopes:                string[];
  redirectUri?:          string;
};

/**
 * Lance un flow OAuth2 avec PKCE
 */
export async function launchOAuth(config: OAuthConfig): Promise<OAuthResult> {
  const redirectUri = config.redirectUri ?? AuthSession.makeRedirectUri({
    scheme: 'cleanly',
  });

  // Utiliser AuthSession.loadAsync pour éviter le PKCE natif (Expo Go compat)
  const request = new AuthSession.AuthRequest({
    clientId:   config.clientId,
    redirectUri,
    scopes:     config.scopes,
    usePKCE:    true,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
  });

  const result = await request.promptAsync({
    authorizationEndpoint: config.authorizationEndpoint,
  });

  if (result.type !== 'success' || !result.params.code) {
    throw new Error(`OAuth annulé : ${result.type}`);
  }

  // Échange code → token
  return exchangeCode({
    code:          result.params.code,
    codeVerifier:  request.codeVerifier ?? '',
    clientId:      config.clientId,
    redirectUri,
    tokenEndpoint: config.tokenEndpoint,
  });
}

async function exchangeCode(params: {
  code: string; codeVerifier: string;
  clientId: string; redirectUri: string; tokenEndpoint: string;
}): Promise<OAuthResult> {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code:          params.code,
    redirect_uri:  params.redirectUri,
    client_id:     params.clientId,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  const data = await res.json() as Record<string, string | number>;
  return {
    accessToken:  data['access_token'] as string,
    refreshToken: data['refresh_token'] as string | undefined,
    expiresIn:    data['expires_in'] as number | undefined,
    scope:        data['scope'] as string | undefined,
  };
}
