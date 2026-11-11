---
name: cleanly-project-rules
description: Règles globales pour le projet Cleanly — toujours actives.
trigger: always_on
---

# Règles Projet Cleanly

## Général
- Toutes les réponses en **français**
- Framework : React Native + Expo SDK 52
- Dossier projet : `G:\project\cleanly-app\` (Windows) ou `~/cleanly-app/` (macOS/Linux)
- Repo GitHub : `https://github.com/becher/cleanly-app`
- Language : TypeScript strict (jamais de `any` implicite)

## Code
- Utiliser `npx expo install` (jamais `npm install`) pour les packages Expo
- Tokens OAuth → toujours `expo-secure-store` (jamais AsyncStorage)
- Commits : Conventional Commits (`feat:`, `fix:`, `chore:`)
- Branches : `feature/xxx`, `fix/xxx`, `platform/xxx`

## Sécurité
- Jamais logger de tokens en console
- Jamais hardcoder de clés API dans le code (utiliser EAS Secrets)
- Toujours valider les tokens avant appel API

## APIs réseaux sociaux
- Rate-limiting : toujours utiliser `runWith429Retry`
- Queue de suppression : SQLite WAL (persistant entre redémarrages)
- Délais entre requêtes : respecter les limites par plateforme

## Recherche concurrente
- Analyse REA de Unpost.apk disponible dans `docs/research/unpost-rea-analysis.md`
- Skill `unpost-research` contient le résumé + endpoints confirmés

## Plateformes supportées (Phase 1)
Discord, X/Twitter, Reddit, Bluesky, Mastodon, Threads, Teams, YouTube

