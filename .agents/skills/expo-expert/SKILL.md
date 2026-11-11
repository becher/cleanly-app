---
name: expo-expert
description: >-
  Expert Expo SDK 52 pour le projet Cleanly. Utiliser quand l'utilisateur
  demande de configurer EAS Build, gérer les plugins Expo, configurer app.json,
  créer un build de production, ou publier sur les stores.
  Inspiré de Jeffallan/claude-skills et vantaflow/claude-skills-collection.
---

# Expo Expert — Cleanly App

## Configuration app.json
```json
{
  "expo": {
    "name": "Cleanly",
    "slug": "cleanly-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "cleanly",
    "newArchEnabled": true,
    "android": {
      "package": "app.cleanly.android",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0A0A"
      },
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.WAKE_LOCK"
      ]
    },
    "ios": {
      "bundleIdentifier": "app.cleanly.ios",
      "supportsTablet": false
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        { "icon": "./assets/notification-icon.png" }
      ],
      [
        "expo-task-manager",
        {}
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

## EAS Build — eas.json
```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "aab" },
      "ios": { "resourceClass": "m1-medium" }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "production"
      }
    }
  }
}
```

## Commandes EAS essentielles
```powershell
# Connexion
eas login

# Premier build Android (dev)
eas build --platform android --profile development

# Build preview (APK à partager)
eas build --platform android --profile preview

# Build production (AAB pour Play Store)
eas build --platform android --profile production

# Soumettre au Play Store
eas submit --platform android --profile production

# Mettre à jour OTA (sans rebuild)
eas update --branch production --message "Fix rate-limiter"
```

## Plugins Expo à installer
```powershell
npx expo install expo-router
npx expo install expo-secure-store
npx expo install expo-sqlite
npx expo install expo-notifications
npx expo install expo-task-manager
npx expo install expo-background-fetch
npx expo install expo-file-system
npx expo install expo-web-browser
npx expo install expo-auth-session
npx expo install @atproto/api        # Bluesky
npx expo install react-native-purchases  # RevenueCat
```

## Foreground Service pour suppression en arrière-plan
```typescript
// Enregistrement du service
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

export async function startForegroundService(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Cleanly actif",
      body: "Suppression en cours en arrière-plan...",
      sticky: true,
    },
    trigger: null,
  });
}
```

## Validation avant chaque release
```powershell
npx expo doctor              # Santé du projet
npx tsc --noEmit             # TypeScript
eas build --platform android --profile preview  # Test build
```

