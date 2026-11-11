---
name: unpost-research
description: >-
  Analyse REA (Reverse Engineering Analysis) complète de Unpost.apk — le concurrent
  principal de Cleanly. Utiliser quand on implémente un client API (Discord, Instagram,
  X/Twitter), quand on a besoin des endpoints exacts, de la logique de rate-limiting,
  du schéma SQLite, ou des détails sur le stockage chiffré. Contient le code source
  décompilé par 11 vraies commandes REA (npx rea-agents@latest).
---

# Recherche Concurrente — Unpost.apk (Analyse REA)

## Rapport complet

👉 Lire le rapport détaillé : [unpost-rea-analysis.md](../../docs/research/unpost-rea-analysis.md)

## Résumé exécutif

**APK analysé :** Unpost v3.1.128 (`com.anonymous.disdeleterReactNative`)  
**Outil :** REA v6.8.0 + jadx-headless-mcp v0.7.1  
**11 commandes REA authentiques exécutées**

## Données clés à réutiliser dans Cleanly

### Endpoints API confirmés par REA
```
Discord  → https://discord.com/api/v9/channels/{id}/messages
           User-Agent: Discord-Android/867
X/Twitter → https://api.twitter.com/2/tweets/{id}  (DELETE)
Instagram → https://www.instagram.com/api/v1/media/{id}/delete/
```

### Stockage chiffré (AES-256-GCM via Android Keystore)
```java
// Code décompilé par REA — RNEncryptedStorageModule
NATIVE_MODULE_NAME = "RNEncryptedStorage"
SHARED_PREFERENCES_FILENAME = "RN_ENCRYPTED_STORAGE_SHARED_PREF"
// → Dans Cleanly : utiliser expo-secure-store (même mécanisme)
```

### Rate-limiting (fonctions identifiées dans le bundle JS)
```
runWith429Retry(fn, maxRetries)      ← Wrapper universel 429
extractRetryAfterSeconds(headers)    ← Parse Retry-After
DEFAULT_RETRY_AFTER                  ← Délai fallback
twitterLikeThenUnlike()              ← Stratégie X/Twitter
```

### SQLite DatabaseConnection (expo-sqlite)
```
Champs : databasePath, NativeDatabaseBinding, NativeStatement
15 méthodes : addHolder, addRef, release, markClosed...
→ Modèle pour notre propre queue de suppression
```

### Modèle économique (Adapty SDK)
```
Méthodes : activate(), getFlow(), createWebPaywallUrl(), updateProfile()
Permissions : com.android.vending.BILLING, CHECK_LICENSE
→ Nous utilisons RevenueCat (alternative open, moins chère)
```

### Faiblesses identifiées à corriger dans Cleanly
| Problème Unpost | Notre solution |
|---|---|
| Perd les crédits si l'app se ferme | Queue SQLite WAL persistante |
| Doit garder l'écran allumé | Foreground Service Android |
| $20-30/mois | $4.99/mois |
| Pas de DMs archivés | Scan complet + archives |
| Pas de mode Review | Aperçu avant suppression |

## Commandes REA pour répliquer l'analyse

> Nécessite : `npx rea-agents@latest` + `jadx-headless-mcp-v0.7.1.jar`

```powershell
# Setup
$env:REA_JADX_MCP_JAR = "chemin\vers\jadx-headless-mcp-v0.7.1.jar"
$env:JADX_CACHE_DIR   = "chemin\vers\jadx_cache"

# Inspecter une classe
npx rea-agents@latest inspect-android-class Unpost.apk "com.emeraldsanto.encryptedstorage.RNEncryptedStorageModule" --json

# Inspecter une méthode
npx rea-agents@latest inspect-android-method Unpost.apk "com.emeraldsanto.encryptedstorage.RNEncryptedStorageModule" "setItem" --json

# Inspecter le package complet (permissions, classes, ressources)
npx rea-agents@latest inspect-android-package Unpost.apk --json

# Inspecter la signature APK
npx rea-agents@latest inspect-apk-signature Unpost.apk --json
```

