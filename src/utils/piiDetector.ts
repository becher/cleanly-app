// Détecteur de Données Sensibles (PII Shield - Personally Identifiable Information)
// Conforme à la Roadmap Cleanly FEAT-02
// Détection 100% locale, sans aucun appel externe ni fuite de données

export type PIIType =
  | 'email'
  | 'phone'
  | 'password'
  | 'apiKey'
  | 'financial'
  | 'token'
  | 'invite';

export interface PIIDetectionResult {
  hasPII: boolean;
  types: PIIType[];
  labels: string[];
  badges: string[];
}

const REGEX_RULES: { type: PIIType; label: string; badge: string; regex: RegExp }[] = [
  // 1. Clés d'API et Secrets de services (Stripe, GitHub, Google, Bearer tokens)
  {
    type: 'apiKey',
    label: "Clé d'API / Secret",
    badge: 'Clé API',
    regex:
      /\b(?:(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}|sk_live_[0-9a-zA-Z]{20,}|AIza[0-9A-Za-z\-_]{35}|api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?|bearer\s+[a-zA-Z0-9_\-\.]{25,})\b/i,
  },
  // 2. Mots de passe et identifiants explicites
  {
    type: 'password',
    label: 'Mot de passe',
    badge: 'Mot de passe',
    regex:
      /\b(?:password|passwd|mdp|mot\s*de\s*passe|pwd)\s*[:=]\s*([^\s]{3,})/i,
  },
  // 3. Adresses Emails
  {
    type: 'email',
    label: 'Adresse e-mail',
    badge: 'Email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i,
  },
  // 4. Numéros de téléphone (Format FR + International)
  {
    type: 'phone',
    label: 'Numéro de téléphone',
    badge: 'Téléphone',
    regex:
      /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}\b|\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  },
  // 5. Données financières (IBAN, Numéro de carte bancaire)
  {
    type: 'financial',
    label: 'Donnée bancaire (IBAN / CB)',
    badge: 'Bancaire',
    regex:
      /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b|\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9]{2})[0-9]{12}|3[47][0-9]{13})\b/i,
  },
  // 6. Tokens de connexion Discord et Web
  {
    type: 'token',
    label: 'Token de connexion',
    badge: 'Token',
    regex: /\b[MNO][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}\b/,
  },
];

/**
 * Analyse le texte d'un message pour détecter la présence de données personnelles sensibles
 */
export function detectPII(content: string): PIIDetectionResult {
  if (!content || typeof content !== 'string') {
    return { hasPII: false, types: [], labels: [], badges: [] };
  }

  const detectedTypes: PIIType[] = [];
  const detectedLabels: string[] = [];
  const detectedBadges: string[] = [];

  for (const rule of REGEX_RULES) {
    if (rule.regex.test(content)) {
      detectedTypes.push(rule.type);
      detectedLabels.push(rule.label);
      detectedBadges.push(rule.badge);
    }
  }

  return {
    hasPII: detectedTypes.length > 0,
    types: detectedTypes,
    labels: detectedLabels,
    badges: detectedBadges,
  };
}

/**
 * Compte le nombre de messages contenant des données sensibles dans une liste
 */
export function countMessagesWithPII(
  messages: Array<{ id: string; content: string }>
): number {
  let count = 0;
  for (const msg of messages) {
    if (detectPII(msg.content).hasPII) {
      count++;
    }
  }
  return count;
}
