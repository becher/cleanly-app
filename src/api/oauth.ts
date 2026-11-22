// OAuth générique — InAppBrowser natif pour React Native CLI
import InAppBrowser from 'react-native-inappbrowser-reborn';

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
  redirectUri: string;
  appScheme?: string;
  responseType?: 'code' | 'token';
  clientSecret?: string;
};

/**
 * Lance un flow OAuth2 standard dans le navigateur in-app Chrome Custom Tab
 */
export async function launchOAuth(config: OAuthConfig): Promise<OAuthResult> {
  const redirectUri = config.redirectUri;
  const interceptScheme = config.appScheme ?? 'cleanly://oauth';
  const responseType = config.responseType ?? 'token';
  const scopeParam = encodeURIComponent(config.scopes.join(' '));

  const authUrl = `${config.authorizationEndpoint}?response_type=${responseType}&client_id=${config.clientId}&scope=${scopeParam}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  console.log('[Cleanly OAuth] Lancement authUrl:', authUrl);
  console.log('[Cleanly OAuth] interceptScheme:', interceptScheme);

  if (await InAppBrowser.isAvailable()) {
    const result = await InAppBrowser.openAuth(authUrl, interceptScheme, {
      showTitle: true,
      toolbarColor: '#1877F2',
      secondaryToolbarColor: '#FFFFFF',
      navigationBarColor: '#FFFFFF',
      enableUrlBarHiding: true,
      enableDefaultShare: false,
      animations: {
        startEnter: 'slide_in_right',
        startExit: 'slide_out_left',
        endEnter: 'slide_in_left',
        endExit: 'slide_out_right',
      },
    });

    if (result.type === 'success' && result.url) {
      // 1. Cas Implicit Grant (#access_token=...) ou query
      const hashOrQuery = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1] ?? '';
      const params = new URLSearchParams(hashOrQuery);

      const accessToken = params.get('access_token');
      if (accessToken) {
        return {
          accessToken,
          expiresIn: params.has('expires_in') ? Number(params.get('expires_in')) : undefined,
          scope: params.get('scope') ?? undefined,
        };
      }

      // 2. Cas Authorization Code (?code=...)
      const code = params.get('code');
      if (code) {
        return exchangeCode({
          code,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri,
          tokenEndpoint: config.tokenEndpoint,
        });
      }

      throw new Error(`Aucun token ou code trouvé dans la redirection : ${result.url}`);
    } else {
      throw new Error(`OAuth annulé : ${result.type}`);
    }
  } else {
    throw new Error('Navigateur in-app non disponible sur cet appareil');
  }
}

async function exchangeCode(params: {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  tokenEndpoint: string;
}): Promise<OAuthResult> {
  const bodyParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
  };

  if (params.clientSecret) {
    bodyParams.client_secret = params.clientSecret;
  }

  const res = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(bodyParams).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as Record<string, string | number>;
  return {
    accessToken: data['access_token'] as string,
    refreshToken: data['refresh_token'] as string | undefined,
    expiresIn: data['expires_in'] as number | undefined,
    scope: data['scope'] as string | undefined,
  };
}
