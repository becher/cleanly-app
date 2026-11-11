---
name: github-actions
description: >-
  CI/CD avec GitHub Actions pour le projet Cleanly (React Native / Expo).
  Utiliser quand l'utilisateur veut automatiser les builds, tests, ou déploiements
  sur Google Play / App Store via EAS Build + GitHub Actions.
---

# GitHub Actions — CI/CD Cleanly App

## Pipeline principal (.github/workflows/ci.yml)

```yaml
name: CI/CD Cleanly

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx expo doctor --non-interactive

  build-android:
    needs: lint-and-type-check
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas build --platform android --profile production --non-interactive
```

## Secrets GitHub à configurer
Aller dans : GitHub repo → Settings → Secrets → Actions

| Secret | Valeur |
|--------|--------|
| `EXPO_TOKEN` | Token EAS (expo.dev → Account → Access Tokens) |
| `GOOGLE_PLAY_KEY` | JSON clé compte service Google Play |

## Workflow de release automatique
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

## Validation
- Chaque push sur `develop` → lint + type-check
- Chaque PR → review obligatoire + CI verte
- Push sur `main` → build EAS automatique
- Tag `v*` → Release GitHub automatique

