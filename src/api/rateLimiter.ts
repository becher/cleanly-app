// Rate Limiter — gestion des erreurs 429 (Too Many Requests)
// Inspiré de l'analyse REA de Unpost.apk : runWith429Retry + extractRetryAfterSeconds

// Délais par défaut entre les requêtes (en ms), par plateforme
export const PLATFORM_DELAYS_MS: Record<string, number> = {
  discord:  500,   // 500ms entre chaque suppression Discord
  twitter:  1000,  // 1s — X/Twitter est strict sur le rate limit
  reddit:   600,   // 600ms
  bluesky:  300,   // 300ms — API assez permissive
  mastodon: 400,   // 400ms
  threads:  1000,  // 1s — API non officielle
  youtube:  800,   // 800ms
  teams:    500,   // 500ms
};

// Nombre max de tentatives avant d'abandonner
const MAX_RETRIES = 5;

/**
 * Extrait le délai depuis l'en-tête Retry-After
 * Exemple : "Retry-After: 30" → 30000ms
 */
export function extractRetryAfterSeconds(headers: Record<string, string>): number {
  const retryAfter = headers['retry-after'] ?? headers['Retry-After'];

  if (!retryAfter) return 60; // Défaut : 60 secondes

  // Peut être un nombre de secondes OU une date HTTP
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) return seconds;

  // Si c'est une date : calculer la différence
  const retryDate = new Date(retryAfter).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((retryDate - now) / 1000));
}

/**
 * Exécute une fonction avec retry automatique sur erreur 429
 *
 * Usage :
 *   const result = await runWith429Retry(() => deleteDiscordMessage(token, channelId, messageId));
 */
export async function runWith429Retry<T>(
  fn: () => Promise<T>,
  platform: string = 'default',
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: unknown) {
      attempt++;

      // Vérifier si c'est une erreur 429
      if (is429Error(error)) {
        const retryHeaders = getErrorHeaders(error);
        const waitSeconds = extractRetryAfterSeconds(retryHeaders);
        const waitMs = waitSeconds * 1000;

        console.log(
          `[RateLimit] ${platform} → 429 reçu. Attente ${waitSeconds}s (tentative ${attempt}/${maxRetries})`
        );

        // Attendre avant de réessayer
        await sleep(waitMs);
        continue;
      }

      // Autre erreur → ne pas réessayer
      throw error;
    }
  }

  throw new Error(`[RateLimit] ${platform} → Échec après ${maxRetries} tentatives (429 persistant)`);
}

/**
 * Attend entre deux requêtes (délai plateforme)
 */
export async function waitPlatformDelay(platform: string): Promise<void> {
  const delay = PLATFORM_DELAYS_MS[platform] ?? 500;
  await sleep(delay);
}

// --- Utilitaires privés ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function is429Error(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  return e['status'] === 429 || e['statusCode'] === 429 || e['code'] === 429;
}

function getErrorHeaders(error: unknown): Record<string, string> {
  if (!error || typeof error !== 'object') return {};
  const e = error as Record<string, unknown>;
  if (e['headers'] && typeof e['headers'] === 'object') {
    return e['headers'] as Record<string, string>;
  }
  return {};
}

