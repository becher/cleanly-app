// OAuth générique — flow PKCE avec expo-auth-session
// Réutilisable pour toutes les plateformes

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

// Nécessaire pour fermer le navigateur automatiquement sur Android
WebBrowser.maybeCompleteAuthSession();

export type OAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
};

export type OAuthConfig = {
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  redirectUri?: string;
};

/**
 * Lance un flow OAuth2 PKCE
 * Ouvre le navigateur in-app, récupère le code, échange contre un token
 */
export async function launchOAuth(config: OAuthConfig): Promise<OAuthResult> {
  // URI de redirection Expo
  const redirectUri = config.redirectUri ?? AuthSession.makeRedirectUri({
    scheme: 'cleanly',
  });

  // PKCE : code verifier + challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Construire la requête d'autorisation
  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri,
    scopes: config.scopes,
    usePKCE: true,
    codeChallenge,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
  });

  // Ouvrir le navigateur OAuth
  const result = await request.promptAsync({
    authorizationEndpoint: config.authorizationEndpoint,
  });

  if (result.type !== 'success' || !result.params.code) {
    throw new Error(`OAuth annulé ou échoué : ${result.type}`);
  }

  // Échanger le code contre un access token
  const tokenResponse = await exchangeCode({
    code: result.params.code,
    codeVerifier,
    clientId: config.clientId,
    redirectUri,
    tokenEndpoint: config.tokenEndpoint,
  });

  return tokenResponse;
}

// Échanger le code d'autorisation contre un token
async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
  tokenEndpoint: string;
}): Promise<OAuthResult> {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code:          params.code,
    redirect_uri:  params.redirectUri,
    client_id:     params.clientId,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} — ${error}`);
  }

  const data = await response.json();

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresIn:    data.expires_in,
    scope:        data.scope,
  };
}

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  // Remplir avec des valeurs pseudo-aléatoires
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  // Convertir base64 → base64url
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
