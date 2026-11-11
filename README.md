# Cleanly App 🧹

> **Nettoyage professionnel de réseaux sociaux** — Supprimez vos anciens posts Discord, X/Twitter, Instagram, Reddit, Teams, Bluesky et plus encore.

[![Build Status](https://github.com/becher/cleanly-app/actions/workflows/ci.yml/badge.svg)](https://github.com/becher/cleanly-app/actions)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://typescriptlang.org)

---

## 🌐 Plateformes supportées

| Réseau | Messages | Posts | Likes | Statut |
|--------|---------|-------|-------|--------|
| Discord | ✅ DMs + Serveurs + Archives | — | — | Phase 1 |
| X / Twitter | — | ✅ Tweets + Réponses | ✅ | Phase 1 |
| Reddit | — | ✅ Posts + Commentaires | — | Phase 1 |
| Bluesky | — | ✅ Posts + Reposts | ✅ | Phase 1 |
| Mastodon | — | ✅ Toots + Boosts | — | Phase 1 |
| Threads | — | ✅ Posts | — | Phase 1 |
| YouTube | — | ✅ Vidéos + Commentaires | — | Phase 1 |
| Microsoft Teams | ✅ Chats + Canaux | — | — | Phase 1 |
| Instagram | — | ✅ Posts + Commentaires | — | Phase 2 |
| Facebook | — | ✅ Posts | — | Phase 2 |
| LinkedIn | — | ✅ Posts | — | Phase 2 |
| TikTok | — | ✅ Vidéos | — | Phase 2 |
| Slack | ✅ Canaux + DMs | — | — | Phase 2 |

---

## 🚀 Démarrage rapide

### Prérequis
- [Node.js 20+](https://nodejs.org)
- [Git](https://git-scm.com)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- **[Antigravity (AGY)](https://antigravity.dev)** — pour les skills AI intégrées

```bash
npm install -g expo-cli eas-cli
```

### Installation

```bash
# 1. Cloner le repo
git clone https://github.com/becher/cleanly-app.git
cd cleanly-app

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npx expo start
```

### Sur une nouvelle machine — Setup complet

```powershell
# Windows (PowerShell)
.\scripts\setup.ps1
```

```bash
# macOS / Linux
bash scripts/setup.sh
```

> Ces scripts installent automatiquement les skills Antigravity dans `~/.gemini/config/skills/`

---

## 🤖 Skills Antigravity (AI Agent)

Ce projet contient des **skills Antigravity** dans `.agents/skills/` qui sont automatiquement chargées par l'agent IA sur toute machine qui clone ce repo.

### Skills disponibles

| Skill | Description |
|-------|-------------|
| `react-native-expert` | Architecture RN, composants, debug, performance |
| `expo-expert` | EAS Build, app.json, plugins, déploiement stores |
| `git-workflow` | Branches, commits, PRs, convention |
| `github-actions` | CI/CD automatisé, build Android/iOS |
| `api-integration` | Clients API Discord / X / Teams / Bluesky... |
| `rate-limiter` | Queue SQLite, retry 429, délais par plateforme |
| `mobile-security` | Tokens OAuth, AES-256-GCM, SecureStore |
| `seo-aso` | Google Play, App Store, mots-clés, screenshots |
| `unpost-research` | Analyse REA du concurrent Unpost.apk |

### Installer les skills manuellement (si Antigravity installé globalement)

```powershell
# Windows
$dest = "$env:USERPROFILE\.gemini\config\skills"
New-Item -ItemType Directory -Force $dest
Copy-Item -Recurse .agents\skills\* $dest\
```

```bash
# macOS / Linux
cp -r .agents/skills/* ~/.gemini/config/skills/
```

---

## 📁 Structure du projet

```
cleanly-app/
├── .agents/                    ← Skills Antigravity (auto-chargées)
│   └── skills/
│       ├── react-native-expert/
│       ├── expo-expert/
│       ├── api-integration/
│       ├── rate-limiter/
│       ├── mobile-security/
│       ├── git-workflow/
│       ├── github-actions/
│       ├── seo-aso/
│       └── unpost-research/    ← Analyse REA du concurrent
│
├── docs/
│   └── research/
│       └── unpost-rea-analysis.md  ← Rapport REA complet (11 commandes)
│
├── app/                        ← Pages Expo Router
│   ├── (tabs)/
│   │   ├── index.tsx           ← Dashboard
│   │   ├── networks.tsx        ← Réseaux connectés
│   │   ├── history.tsx         ← Historique des suppressions
│   │   └── settings.tsx        ← Paramètres
│   ├── auth/[platform].tsx     ← Flow OAuth par réseau
│   └── _layout.tsx
│
├── src/
│   ├── api/                    ← Clients API par réseau social
│   │   ├── discord.ts
│   │   ├── twitter.ts
│   │   ├── teams.ts
│   │   ├── bluesky.ts
│   │   ├── mastodon.ts
│   │   └── rateLimiter.ts
│   ├── services/
│   │   ├── deletionQueue.ts    ← Queue SQLite WAL persistante
│   │   └── foregroundService.ts ← Service Android arrière-plan
│   ├── store/                  ← Zustand state management
│   └── db/                     ← Schéma SQLite + migrations
│
├── scripts/
│   ├── setup.ps1               ← Setup Windows (Node, skills...)
│   └── setup.sh                ← Setup macOS/Linux
│
├── .github/workflows/
│   └── ci.yml                  ← GitHub Actions CI/CD
│
├── app.json                    ← Config Expo
├── eas.json                    ← Config EAS Build
└── README.md
```

---

## 🛠️ Stack technique

```
React Native 0.76 (New Architecture)
Expo SDK 52 + Expo Router 4
TypeScript strict
Tamagui (UI dark/light)
Zustand + TanStack Query v5
expo-sqlite (WAL mode) — queue de suppression persistante
expo-secure-store (AES-256-GCM) — tokens OAuth chiffrés
expo-notifications + expo-task-manager — service arrière-plan
RevenueCat — abonnements freemium
Sentry — crash reporting
```

---

## 🔒 Sécurité

- Tokens OAuth stockés avec **AES-256-GCM via Android Keystore**
- Aucune donnée envoyée à nos serveurs
- Clés API via **EAS Secrets** uniquement (jamais dans le code)
- `android:allowBackup="false"` activé

---

## 💰 Modèle économique

| | Gratuit | Pro — $4.99/mois |
|--|---------|-----------------|
| Réseaux | 1 réseau | Tous |
| Suppressions | 500/mois | Illimitées |
| Arrière-plan | ❌ | ✅ |
| Planification | ❌ | ✅ |
| Multi-comptes | ❌ | ✅ |
| Filtres avancés | ❌ | ✅ |
| Export backup | ✅ | ✅ |

> **5× moins cher que Unpost** (~$25/mois)

---

## 📚 Documentation de recherche

- 📄 [Analyse REA de Unpost.apk](./docs/research/unpost-rea-analysis.md) — Reverse engineering complet du concurrent (11 commandes REA authentiques)

---

## 🤝 Contribution

```bash
# Créer une branche
git checkout -b feature/nouvelle-plateforme

# Committer (Conventional Commits)
git commit -m "feat(bluesky): add bulk post deletion"

# Pousser et créer un PR
git push origin feature/nouvelle-plateforme
```

---

## 📄 Licence

MIT — Voir [LICENSE](./LICENSE)

