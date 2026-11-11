---
name: mobile-security
description: >-
  Sécurité mobile pour Cleanly : stockage des tokens OAuth, chiffrement AES-256-GCM,
  Android Keystore, bonnes pratiques de sécurité pour une app qui gère des tokens
  de réseaux sociaux sensibles. Utiliser quand on implémente l'auth, le stockage
  des credentials, ou qu'on vérifie la sécurité de l'app.
  Basé sur l'analyse REA de RNEncryptedStorageModule dans Unpost.apk.
---

# Sécurité Mobile — Cleanly App

## Stockage des tokens OAuth

### expo-secure-store (recommandé)
```typescript
// src/store/authStore.ts
import * as SecureStore from 'expo-secure-store';

// Stocker un token (AES-256-GCM via Android Keystore)
export async function storeToken(
  platform: string,
  token: string
): Promise<void> {
  await SecureStore.setItemAsync(`token_${platform}`, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

// Récupérer un token
export async function getToken(platform: string): Promise<string | null> {
  return SecureStore.getItemAsync(`token_${platform}`);
}

// Supprimer un token (déconnexion)
export async function removeToken(platform: string): Promise<void> {
  await SecureStore.deleteItemAsync(`token_${platform}`);
}
```

> Basé sur `RNEncryptedStorageModule` de Unpost (analyse REA) :
> - `SHARED_PREFERENCES_FILENAME = "RN_ENCRYPTED_STORAGE_SHARED_PREF"`
> - Schéma : AES256-GCM via Android Keystore
> - Fallback : SharedPreferences si Keystore indisponible

## Bonnes pratiques

### À FAIRE ✅
- Stocker les tokens uniquement dans `expo-secure-store`
- Utiliser `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (non synchronisé iCloud)
- Effacer les tokens à la déconnexion
- Valider les tokens avant chaque appel API
- Utiliser PKCE pour les flows OAuth publics

### À NE PAS FAIRE ❌
- Jamais stocker un token dans `AsyncStorage` (non chiffré)
- Jamais logger les tokens dans la console
- Jamais sauvegarder les tokens dans un fichier
- Jamais envoyer les tokens à un backend tiers

## Certificate Pinning (optionnel, niveau Pro)
```typescript
// Pour les APIs critiques, valider le certificat SSL
// Utiliser react-native-ssl-pinning pour Discord/Twitter
```

## Checklist sécurité avant release
- [ ] Tokens stockés dans SecureStore uniquement
- [ ] Pas de tokens dans les logs Sentry
- [ ] ProGuard/R8 activé pour l'APK release
- [ ] Pas de clés API dans le code source (utiliser .env + EAS Secrets)
- [ ] `android:allowBackup="false"` dans AndroidManifest
- [ ] Network Security Config : HTTPS uniquement

