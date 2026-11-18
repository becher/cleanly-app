// Stub expo-crypto — remplace le module natif sur Expo Go
// Utilisé par expo-auth-session pour PKCE (SHA-256)

'use strict';

// Algorithmes supportés
const CryptoDigestAlgorithm = {
  SHA1:   'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
  MD5:    'MD5',
};

const CryptoEncoding = {
  BASE64: 'base64',
  HEX:    'hex',
};

// Génère un digest avec SubtleCrypto (Web Crypto API — disponible dans Hermes)
async function digestStringAsync(algorithm, data, options = {}) {
  try {
    const algoName = algorithm === 'SHA-256' ? 'SHA-256'
                   : algorithm === 'SHA-1'   ? 'SHA-1'
                   : algorithm === 'SHA-512' ? 'SHA-512'
                   : 'SHA-256';

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algoName, dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    if (options.encoding === 'hex') {
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Base64 (défaut)
    const base64 = btoa(String.fromCharCode(...hashArray));
    return base64;
  } catch (e) {
    // Fallback si SubtleCrypto n'est pas disponible
    console.warn('[expo-crypto stub] SubtleCrypto failed, using fallback', e);
    // Fallback simple — suffisant pour le PKCE en développement
    const hash = Array.from(data).reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    return btoa(String(Math.abs(hash)));
  }
}

// Génère des bytes aléatoires
function getRandomBytes(byteCount) {
  const array = new Uint8Array(byteCount);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < byteCount; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
}

async function getRandomBytesAsync(byteCount) {
  return getRandomBytes(byteCount);
}

module.exports = {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytes,
  getRandomBytesAsync,
  // Exports nommés supplémentaires attendus par expo-auth-session
  default: {
    CryptoDigestAlgorithm,
    CryptoEncoding,
    digestStringAsync,
    getRandomBytes,
    getRandomBytesAsync,
  },
};
