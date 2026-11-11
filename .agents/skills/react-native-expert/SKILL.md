---
name: react-native-expert
description: >-
  Expert React Native et Expo pour le projet Cleanly. Utiliser quand l'utilisateur
  demande de créer des composants, naviguer, optimiser les performances, gérer les
  erreurs Metro, configurer Expo Router, ou déboguer des builds Android/iOS.
  Inspiré de Jeffallan/claude-skills react-native-expert.
---

# React Native + Expo Expert — Cleanly App

## Stack du projet
- **React Native 0.76** (New Architecture activée)
- **Expo SDK 52** + Expo Router 4 (file-based)
- **Tamagui** pour l'UI (dark/light mode)
- **Zustand** (state global) + **TanStack Query v5** (cache API)
- **expo-sqlite** (WAL mode) + **expo-secure-store** (tokens)

## Architecture des dossiers
```
G:\project\cleanly-app\
├── app/                    ← Pages Expo Router
│   ├── (tabs)/
│   │   ├── index.tsx      ← Dashboard
│   │   ├── networks.tsx   ← Réseaux connectés
│   │   ├── history.tsx    ← Historique
│   │   └── settings.tsx   ← Paramètres
│   ├── auth/[platform].tsx ← Auth OAuth
│   └── _layout.tsx
├── src/
│   ├── api/               ← Clients API par réseau
│   ├── services/          ← deletionQueue, foregroundService
│   ├── store/             ← Zustand stores
│   ├── components/        ← Composants réutilisables
│   └── db/                ← Schéma SQLite + migrations
└── assets/
```

## Workflow de développement

### 1. Démarrer le projet
```powershell
cd G:\project\cleanly-app
npx expo start --clear
```

### 2. Vérifier la santé Expo
```powershell
npx expo doctor
```

### 3. Build Android
```powershell
npx expo run:android
# ou EAS Build
eas build --platform android --profile preview
```

## Bonnes pratiques React Native

### Composants
- Toujours utiliser `memo()` pour les composants de liste
- `useCallback` pour les handlers dans les `FlatList`
- `SafeAreaView` pour les écrans principaux
- `KeyboardAvoidingView` pour les formulaires

### Performance
- `FlashList` au lieu de `FlatList` pour les grandes listes
- Images : `expo-image` (cache intégré)
- Éviter les re-renders : `useMemo` pour les sélecteurs Zustand

### Erreurs courantes et fixes
| Erreur | Fix |
|--------|-----|
| Metro bundler bloqué | `npx expo start --clear` |
| Dépendance native manquante | `npx expo install <pkg>` (jamais `npm install`) |
| Android build fail | `cd android && ./gradlew clean` |
| iOS build fail | `cd ios && pod install` |
| New Architecture crash | Vérifier `app.json` → `"newArchEnabled": true` |

## Foreground Service Android (suppression en arrière-plan)
```typescript
// src/services/foregroundService.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

const DELETION_TASK = 'DELETION_BACKGROUND_TASK';

TaskManager.defineTask(DELETION_TASK, async () => {
  // Traiter la queue SQLite
  const result = await processDeletionQueue();
  return result
    ? BackgroundFetch.BackgroundFetchResult.NewData
    : BackgroundFetch.BackgroundFetchResult.NoData;
});
```

## Validation
- Après chaque composant : `npx expo start` et tester sur émulateur
- Avant commit : `npx tsc --noEmit` (vérifier TypeScript)
- Avant release : `npx expo doctor && eas build --profile production`

