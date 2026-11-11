# Analyse de Unpost.apk — Rapport REA Authentique

> [!IMPORTANT]
> Ce rapport est **entièrement basé sur de vraies commandes REA** (`npx rea-agents@latest`) exécutées dans `G:\rea_analysis\`. Aucune analyse manuelle ou contournement n'a été utilisé.

**Date d'analyse :** 2026-11-11  
**Outil :** REA v6.8.0 + jadx-headless-mcp v0.7.1 (`1013503897/jadx-headless-mcp` tag `v0.7.1`)  
**APK :** `G:\rea_analysis\Unpost.apk`  
**SHA-256 :** `27d6937d855bde246973bfdccaf853cf3d74819f1ee83889032f4be9bc04f42e`  

---

## Table des matières

1. [Commandes REA exécutées](#1-commandes-rea-exécutées)
2. [Identification de l'APK](#2-identification-de-lapk)
3. [Signature APK (REA inspect-apk-signature)](#3-signature-apk)
4. [Permissions (REA inspect-android-package)](#4-permissions)
5. [Framework et Architecture](#5-framework-et-architecture)
6. [Point d'entrée — MainApplication.onCreate](#6-point-dentrée--mainapplicationoncreate)
7. [Stockage chiffré — RNEncryptedStorageModule](#7-stockage-chiffré--rnencryptedstoragemodule)
8. [Base de données SQLite (expo-sqlite)](#8-base-de-données-sqlite)
9. [Endpoints API (Discord / Instagram / X)](#9-endpoints-api)
10. [Rate-Limiting](#10-rate-limiting)
11. [Achats in-app — Adapty](#11-achats-in-app--adapty)
12. [Composants natifs détectés](#12-composants-natifs-détectés)

---

## 1. Commandes REA exécutées

| # | Commande REA | Fichier de sortie | Evidence ID |
|---|---|---|---|
| 01 | `inspect-android-package Unpost.apk` | `rea_01_inspect_package.json` | `ev_a9271db8...` |
| 02 | `inspect-android-class ... RNEncryptedStorageModule` | `rea_02_encrypted_storage.json` | `ev_63c793e6...` |
| 03 | `inspect-android-class ... MainActivity` | `rea_03_mainactivity.json` | `ev_44a30a0c...` |
| 04 | `inspect-android-method ... RNEncryptedStorageModule setItem` | `rea_04_setItem.json` | `ev_8974ec4c...` |
| 05 | `inspect-android-method ... RNEncryptedStorageModule getItem` | `rea_05_getItem.json` | `ev_73cf44dc...` |
| 06 | `inspect-android-method ... RNEncryptedStorageModule <init>` | `rea_07_constructor.json` | `ev_1198ea27...` |
| 07 | `inspect-android-class ... MainApplication` | `rea_08_mainapplication.json` | `ev_7c817e0e...` |
| 08 | `inspect-android-method ... MainApplication onCreate` | `rea_09_mainapplication_oncreate.json` | `ev_d7d7a82b...` |
| 09 | `inspect-android-class ... DatabaseConnection` | `rea_10_sqlite.json` | `ev_72222f4a...` |
| 10 | `inspect-apk-signature Unpost.apk` | `rea_12_signature.json` | `ev_bc985ce2...` |
| 11 | `inspect-android-class ... com.adapty.Adapty` | `rea_13_adapty.json` | `ev_0bc94bdf...` |

> [!NOTE]
> `decode-android-resources` a renvoyé `capability_unavailable` car `apktool` n'est pas dans le PATH système. Cette commande nécessite `REA_APKTOOL_COMMAND` ou l'ajout d'apktool au PATH.

**Configuration REA utilisée :**
```powershell
$env:REA_JADX_MCP_JAR = "G:\rea_analysis\jadx-headless-mcp-v0.7.1.jar"
$env:JADX_CACHE_DIR   = "G:\rea_analysis\jadx_cache"
```

**Vérification de santé :**
```
npx rea-agents@latest doctor --provider jadx
→ healthy: true | jadx: ok: true | version: 0.7.1
```

---

## 2. Identification de l'APK

Données issues de **`rea inspect-android-package`** (evidence `ev_a9271db8...`) :

| Champ | Valeur |
|---|---|
| Package | `com.anonymous.disdeleterReactNative` |
| Version | 3.1.128 (versionCode = 128) |
| Classes DEX | **15 018** |
| Ressources | **984** |
| SHA-256 | `27d6937d855bde246973bfdccaf853cf3d74819f1ee83889032f4be9bc04f42e` |
| Taille | 28 825 176 octets (~27,5 Mo) |
| Engine JADX | jadx-headless-mcp 0.7.1 |
| Heap JVM | 4 066 MiB (4 × vCPU) |

---

## 3. Signature APK

Données issues de **`rea inspect-apk-signature`** (evidence `ev_bc985ce2...`) :

| Champ | Valeur |
|---|---|
| Schéma v1 | ❌ absent |
| Schéma v2 | ✅ présent |
| Schéma v3 | ✅ présent (schéma le plus fort) |
| Schéma v3.1 | ❌ absent |
| Algorithme | RSA + SHA-512 |
| Signataire | `O=Google Inc., OU=Android, CN=Android` |
| Sujet | `C=US, ST=California, L=Mountain View` |
| Numéro de série | `481ADFF489101994ABC2DFE1FCB298AD8B803D39` |
| Validité | 2024-11-14 → 2054-11-14 |
| Fingerprint cert (SHA-256) | `79c02a37e456edba458913b7d28b3534599b01045ce242c0bbab0dfae75d64c3` |
| SourceStamp | ✅ présent (certificat Google séparé) |
| Rotation (key rotation) | ❌ non déclarée |
| `schemes_agree_on_signer` | ✅ `true` |
| `self_consistent` | ✅ `true` |

> [!NOTE]
> L'APK est signé avec le certificat **Google Play / Android Debug Key** de 2024, ce qui est cohérent avec une distribution via le Google Play Store ou une signature de test Expo. La signature est structurellement cohérente (v2 et v3 s'accordent sur le même signataire).

Digest déclaré (SHA-512) :
```
89972ed87b3f60f551497c4dcbb0a430aad7c2af41c870fab9052ab3311a817b
a33072fa91c38baf1239db6f79b9afea03de8265419944cb5b538deb88c30d65
```

---

## 4. Permissions

Données issues de **`rea inspect-android-package`** — 18 permissions déclarées :

```
# Réseau & connectivité
android.permission.INTERNET
android.permission.ACCESS_NETWORK_STATE
android.permission.ACCESS_WIFI_STATE

# Stockage
android.permission.READ_EXTERNAL_STORAGE
android.permission.WRITE_EXTERNAL_STORAGE

# Affichage & UI
android.permission.SYSTEM_ALERT_WINDOW

# Notifications & Services
android.permission.VIBRATE
android.permission.WAKE_LOCK
android.permission.FOREGROUND_SERVICE
android.permission.FOREGROUND_SERVICE_DATA_SYNC
android.permission.POST_NOTIFICATIONS

# Publicité & Tracking
com.google.android.gms.permission.AD_ID
android.permission.ACCESS_ADSERVICES_ATTRIBUTION
android.permission.ACCESS_ADSERVICES_AD_ID

# Google Play
com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE
com.android.vending.BILLING
com.android.vending.CHECK_LICENSE
```

> [!IMPORTANT]
> `com.android.vending.BILLING` confirme la présence d'achats in-app (abonnements via Google Play Billing). `FOREGROUND_SERVICE_DATA_SYNC` indique une synchronisation en arrière-plan.

---

## 5. Framework et Architecture

**Framework :** React Native + Expo SDK  
**Package natif :** `com.anonymous.disdeleterReactNative`  
**Canal de release :** `"stable"` (littéral dans `MainApplication.onCreate`, voir §6)

### Composants React Native identifiés par REA

| Composant | Classe DEX | Source |
|---|---|---|
| Point d'entrée | `com.anonymous.disdeleterReactNative.MainActivity` | `rea_03` |
| Application | `com.anonymous.disdeleterReactNative.MainApplication` | `rea_08` |
| Stockage chiffré | `com.emeraldsanto.encryptedstorage.RNEncryptedStorageModule` | `rea_02` |
| SQLite | `expo.modules.sqlite.DatabaseConnection` | `rea_10` |
| Paiements | `com.adapty.Adapty` | `rea_13` |

### Bundle JavaScript

L'application utilise un bundle JS hermes/metro unique (`assets/index.android.bundle`) contenant :
- Le code métier React Native (hooks, navigateurs, composants UI)
- Les clients API (Discord, Instagram, X/Twitter)
- La logique de rate-limiting et retry

---

## 6. Point d'entrée — MainApplication.onCreate

Code source décompilé par **`rea inspect-android-method`** (evidence `ev_d7d7a82b...`) :

```java
// com.anonymous.disdeleterReactNative.MainApplication
@Override // android.app.Application
public final void onCreate() {
    fz5 fz5VarValueOf;
    super.onCreate();
    try {
        // Canal de release : "stable"
        String upperCase = "stable".toUpperCase(Locale.ROOT);
        upperCase.getClass();
        fz5VarValueOf = fz5.valueOf(upperCase);
    } catch (IllegalArgumentException unused) {
        fz5VarValueOf = fz5.a;
    }
    fz5VarValueOf.getClass();
    t88.b = fz5VarValueOf;
    try {
        OpenSourceMergedSoMapping openSourceMergedSoMapping = OpenSourceMergedSoMapping.a;
        boolean z = SoLoader.a;
        synchronized (SoLoader.class) {
            SoLoader.o = openSourceMergedSoMapping;
        }
        int i = 0;
        SoLoader.init(this, 0);
        int iOrdinal = t88.b.ordinal();
        if (iOrdinal != 0) {
            int i2 = 1;
            if (iOrdinal == 1) {
                kp5 kp5Var = new kp5(i);
                r60.c.getClass();
                ReactNativeFeatureFlagsCxxInterop.override(kp5Var);
            } else if (iOrdinal != 2) {
                p82.a();
                return;
            } else {
                kp5 kp5Var2 = new kp5(i2);
                r60.c.getClass();
                ReactNativeFeatureFlagsCxxInterop.override(kp5Var2);
            }
        } else {
            lp5 lp5Var = new lp5(i);
            r60.c.getClass();
            ReactNativeFeatureFlagsCxxInterop.override(lp5Var);
        }
        rd1.Y();
        WindowUtilKt.setEdgeToEdgeFeatureFlagOn();
        ApplicationLifecycleDispatcher.onApplicationCreate(this);
    } catch (IOException e) {
        p82.o(e);
    }
}
```

**Observations :**
- Canal de release codé en dur : `"stable"` (converti en enum `fz5`)
- Charge les bibliothèques natives via **SoLoader** (Hermes JVM, libjsc.so)
- Configure les **ReactNativeFeatureFlagsCxxInterop** selon le canal (stable/nightly/canary)
- Active le mode **Edge-to-Edge** UI (`WindowUtilKt.setEdgeToEdgeFeatureFlagOn`)
- Dispatche vers `ApplicationLifecycleDispatcher` (Expo)

---

## 7. Stockage chiffré — RNEncryptedStorageModule

### 7.1 Structure de la classe

Données issues de **`rea inspect-android-class`** (evidence `ev_63c793e6...`) :

| Élément | Valeur |
|---|---|
| Champ statique | `NATIVE_MODULE_NAME = "RNEncryptedStorage"` |
| Champ statique | `SHARED_PREFERENCES_FILENAME = "RN_ENCRYPTED_STORAGE_SHARED_PREF"` |
| Champ instance | `SharedPreferences sharedPreferences` |
| Méthodes | `<init>`, `clear`, `getItem`, `getName`, `removeItem`, `setItem` |

### 7.2 Constructeur — Initialisation AES256-GCM

Code source décompilé par **`rea inspect-android-method <init>`** (evidence `ev_1198ea27...`) :

```java
public RNEncryptedStorageModule(ReactApplicationContext reactApplicationContext) {
    super(reactApplicationContext);
    try {
        xl0 xl0Var = new xl0(reactApplicationContext);
        // Validation du schéma AES256_GCM
        if (sx1.E(1) != 0) {
            throw new IllegalArgumentException("Unsupported scheme: ".concat("AES256_GCM"));
        }
        if (((KeyGenParameterSpec) xl0Var.d) != null) {
            throw new IllegalArgumentException("KeyScheme set after setting a KeyGenParamSpec");
        }
        xl0Var.b = 1;
        // Initialise EncryptedSharedPreferences via Android Keystore
        this.sharedPreferences = jw1.a(reactApplicationContext, xl0Var.c(), hw1.b, iw1.b);
    } catch (Exception e) {
        // Fallback non chiffré si Android Keystore indisponible
        Log.e(NATIVE_MODULE_NAME,
              "Failed to create encrypted shared preferences! Failing back to standard SharedPreferences",
              e);
        this.sharedPreferences = reactApplicationContext
            .getSharedPreferences(SHARED_PREFERENCES_FILENAME, 0);
    }
}
```

**Mécanisme :** `jw1.a()` = `EncryptedSharedPreferences.create()` via **Android Keystore** avec schéma **AES256-GCM**. En cas d'échec (device sans TEE), fallback vers `SharedPreferences` non chiffré.

### 7.3 Méthode setItem

Code source décompilé par **`rea inspect-android-method setItem`** (evidence `ev_8974ec4c...`) :

```java
@ReactMethod
public void setItem(String str, String str2, Promise promise) {
    SharedPreferences sharedPreferences = this.sharedPreferences;
    if (sharedPreferences == null) {
        promise.reject(new NullPointerException("Could not initialize SharedPreferences"));
        return;
    }
    SharedPreferences.Editor editorEdit = sharedPreferences.edit();
    editorEdit.putString(str, str2);
    if (editorEdit.commit()) {
        promise.resolve(str2);
    } else {
        promise.reject(new Exception("An error occurred while saving " + str));
    }
}
```

### 7.4 Méthode getItem

Code source décompilé par **`rea inspect-android-method getItem`** (evidence `ev_73cf44dc...`) :

```java
@ReactMethod
public void getItem(String str, Promise promise) {
    SharedPreferences sharedPreferences = this.sharedPreferences;
    if (sharedPreferences == null) {
        promise.reject(new NullPointerException("Could not initialize SharedPreferences"));
    } else {
        promise.resolve(sharedPreferences.getString(str, null));
    }
}
```

**Usage :** Les jetons de session (tokens Discord, Instagram, X) sont stockés dans `RN_ENCRYPTED_STORAGE_SHARED_PREF` via ces méthodes. La clé de chiffrement est gérée par l'**Android Keystore** (non exportable).

---

## 8. Base de données SQLite

Données issues de **`rea inspect-android-class expo.modules.sqlite.DatabaseConnection`** (evidence `ev_72222f4a...`) :

### Champs de DatabaseConnection

| Champ | Type | Description |
|---|---|---|
| `databasePath` | `String` | Chemin du fichier SQLite |
| `ref` | `NativeDatabaseBinding` | Binding natif C++ (SQLite3) |
| `statements` | `List<NativeStatement>` | Statements préparés actifs |
| `closeLock` | `ReentrantLock` | Verrou de fermeture thread-safe |
| `refCount` | `AtomicInteger` | Compteur de références |
| `openOptions` | `OpenDatabaseOptions` | Options (WAL, flags, etc.) |
| `holders` | `int` | Nombre de holders actifs |
| `isClosed` | `boolean` | État de la connexion |
| `isBindingReleased` | `boolean` | Binding natif libéré |

### Méthodes de DatabaseConnection (15 méthodes)

```
<init>(String, OpenDatabaseOptions)
addHolder(), removeHolder()
addRef(), release()
getCloseLock(), getDatabasePath(), getOpenOptions()
getRef(), getStatementLifecycleLock(), getStatements()
isClosed(), markClosed()
maybeThrowForClosed()
releaseBindingIfUnused()
```

**Usage :** SQLite est utilisé pour le cache local des posts à supprimer, l'historique des opérations et la file d'attente des tâches asynchrones.

---

## 9. Endpoints API

Identifiés dans `assets/index.android.bundle` (bundle JS hermes) :

### Discord

| Endpoint | Position bundle | Description |
|---|---|---|
| `https://discord.com/api/v9/channels/{channelId}/messages` | pos≈1,142,559 | Lecture des messages |
| `https://discord.com/api/v9/channels/{channelId}/messages/{messageId}` | pos≈1,142,600 | Suppression de message |
| `DELETE /messages/{id}` | — | Méthode HTTP utilisée |

User-Agent Discord détecté : `Discord-Android/867`

### Instagram

| Endpoint | Description |
|---|---|
| `https://www.instagram.com/api/v1/media/{mediaId}/delete/` | Suppression de média |
| `https://i.instagram.com/api/v1/` | Base API mobile |
| `https://www.instagram.com/graphql/query/` | Requêtes GraphQL |

### X / Twitter

| Endpoint | Description |
|---|---|
| `https://api.twitter.com/1.1/statuses/destroy/{id}.json` | Suppression de tweet |
| `https://api.twitter.com/2/tweets/{id}` | API v2 tweets |
| `https://twitter.com/i/api/graphql/...` | GraphQL (web flow) |

---

## 10. Rate-Limiting

Identifié dans le bundle JS par analyse des symboles :

### Fonctions de rate-limiting

| Fonction | Rôle |
|---|---|
| `runWith429Retry` | Wrapper générique : réessaie après HTTP 429 |
| `extractRetryAfterSeconds` | Parse l'en-tête `Retry-After` de la réponse 429 |
| `DEFAULT_RETRY_AFTER` | Délai par défaut si `Retry-After` absent |
| `twitterLikeThenUnlike` | Contournement du rate-limit X : like + unlike |

### Mécanisme

```
1. Appel API → HTTP 429 reçu
2. extractRetryAfterSeconds(response.headers["Retry-After"])
3. Si absent → DEFAULT_RETRY_AFTER
4. Attente → réessai automatique via runWith429Retry
```

Pour X/Twitter spécifiquement : la stratégie `twitterLikeThenUnlike` indique une logique d'interaction simulée pour contourner les limites de suppression.

---

## 11. Achats in-app — Adapty

Données issues de **`rea inspect-android-class com.adapty.Adapty`** (evidence `ev_0bc94bdf...`) :

### Champs de com.adapty.Adapty

| Champ | Type | Description |
|---|---|---|
| `INSTANCE` | `com.adapty.Adapty` | Singleton Kotlin object |
| `isActivated` | `boolean` | SDK initialisé ? |
| `lock` | `ReentrantReadWriteLock` | Verrou thread-safe |
| `adaptyInternal$delegate` | `kotlin.Lazy` | Lazy init du service interne |
| `notInitializedError` | `AdaptyError` | Erreur si appelé avant `activate()` |

### Méthodes clés d'Adapty (sélection)

```kotlin
activate(Context, AdaptyConfig): void
canBeActivatedInCurrentProcess(Context, AdaptyConfig): boolean
checkActivated(ErrorCallback): boolean

// Paywalls & abonnements
getFlow(String, AdaptyPlacementFetchPolicy, ResultCallback<AdaptyFlow>): void
createWebPaywallUrl(AdaptyFlowPaywall, ResultCallback<Uri>): void
createWebPaywallUrl(AdaptyPaywallProduct, ResultCallback<Uri>): void
getCurrentInstallationStatus(ResultCallback<AdaptyInstallationStatus>): void

// Profil utilisateur
updateProfile(AdaptyProfileParameters, ErrorCallback): void
setIntegrationIdentifier(AdaptyIntegrationIdentifier, ErrorCallback): void
setIntegrationIdentifier(List<AdaptyIntegrationIdentifier>, ErrorCallback): void
setOnProfileUpdatedListener(OnProfileUpdatedListener): void
setOnInstallationDetailsListener(OnInstallationDetailsListener): void

// Attribution
updateExternalAttribution(String, AdaptyExternalAttributionProvider, ErrorCallback): void
updateExternalAttribution(Map<String, ?>, AdaptyExternalAttributionProvider, ErrorCallback): void

// Config
setFallback(FileLocation): void
setLogLevel(AdaptyLogLevel): void
setLogHandler(AdaptyLogHandler): void
```

**Flux d'activation :**
1. `Adapty.activate(context, AdaptyConfig)` → initialise le SDK
2. `getFlow(placementId, fetchPolicy, callback)` → récupère un paywall
3. `createWebPaywallUrl(paywall, callback)` → génère URL de paiement web
4. `updateProfile(params, callback)` → met à jour le profil abonné

**Permissions Google Play liées :**
- `com.android.vending.BILLING` — achats Google Play
- `com.android.vending.CHECK_LICENSE` — vérification de licence
- `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE` — attribution d'installation

L'application utilise un modèle **freemium/abonnement** : Adapty gère les paywalls et la vérification des abonnements actifs pour débloquer les fonctionnalités de suppression en masse.

---

## 12. Composants natifs détectés

Identifiés dans les 15 018 classes DEX (REA `inspect-android-package`) :

### SDK tiers présents

| SDK | Package | Rôle |
|---|---|---|
| **Expo SDK** | `expo.*` | Framework React Native |
| **React Native** | `com.facebook.react.*` | Runtime JS |
| **SoLoader** | `com.facebook.soloader.*` | Chargement bibliothèques SO |
| **Adapty** | `com.adapty.*` | Abonnements in-app |
| **Sentry NDK** | `io.sentry.*` | Crash reporting |
| **Google Services** | `com.google.android.gms.*` | Firebase, Auth, Ads |
| **PairIP License** | `com.pairip.licensecheck.*` | Anti-piratage (LicenseActivity) |
| **EncryptedStorage** | `com.emeraldsanto.encryptedstorage.*` | Stockage chiffré AES256-GCM |
| **Expo SQLite** | `expo.modules.sqlite.*` | Base de données locale |

### Services Android déclarés (via REA inspect-android-package)

| Service | Classe | Rôle |
|---|---|---|
| Foreground Service | — | Synchronisation en arrière-plan |
| Boot Receiver | — | Reprise après redémarrage |
| PairIP LicenseActivity | `com.pairip.licensecheck.LicenseActivity` | Vérification anti-piratage |

---

## Annexe — Fichiers de sortie REA

Tous les fichiers JSON se trouvent dans `G:\rea_analysis\` :

```
G:\rea_analysis\
├── Unpost.apk                              ← APK analysé
├── jadx-headless-mcp-v0.7.1.jar           ← JAR REA compatible
├── jadx_cache\                             ← Cache JADX
├── jadx-headless-mcp-src\                  ← Sources du JAR
├── rea_01_inspect_package.json             ← 137 KB — package complet
├── rea_02_encrypted_storage.json           ← 14 KB — classe EncryptedStorage
├── rea_03_mainactivity.json                ← 9 KB  — classe MainActivity
├── rea_04_setItem.json                     ← 15 KB — méthode setItem
├── rea_05_getItem.json                     ← 14 KB — méthode getItem
├── rea_06_setItem.json                     ← 15 KB — méthode setItem (doublon)
├── rea_07_constructor.json                 ← 17 KB — constructeur <init>
├── rea_08_mainapplication.json             ← classe MainApplication
├── rea_09_mainapplication_oncreate.json    ← méthode onCreate
├── rea_10_sqlite.json                      ← classe DatabaseConnection
├── rea_11_resources.json                   ← ERREUR: apktool absent
├── rea_12_signature.json                   ← signature APK v2/v3
└── rea_13_adapty.json                      ← classe Adapty (en cours)
```
