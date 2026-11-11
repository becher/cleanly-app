---
name: git-workflow
description: >-
  Workflow Git professionnel pour le projet Cleanly. Utiliser quand l'utilisateur
  demande de committer, pousser, créer une branche, faire un PR, résoudre un conflit,
  ou configurer GitHub. Repo: https://github.com/becher/cleanly-app
---

# Git Workflow — Projet Cleanly

## Configuration initiale (une seule fois)
```powershell
git config --global user.name "Becher"
git config --global user.email "ton@email.com"
git config --global core.autocrlf true   # Windows CRLF
```

## Cloner le repo
```powershell
cd G:\project
git clone https://github.com/becher/cleanly-app.git
cd cleanly-app
```

## Convention de branches
```
main          ← Production stable
develop       ← Intégration
feature/xxx   ← Nouvelle fonctionnalité
fix/xxx       ← Bug fix
platform/xxx  ← Nouveau réseau social (ex: platform/teams)
```

## Workflow quotidien
```powershell
# 1. Créer une branche de feature
git checkout develop
git pull origin develop
git checkout -b feature/discord-deletion

# 2. Développer...

# 3. Committer (convention Conventional Commits)
git add .
git commit -m "feat(discord): add message deletion with rate-limiter"

# 4. Pousser
git push origin feature/discord-deletion

# 5. Créer un PR vers develop sur GitHub
```

## Convention des commits (Conventional Commits)
```
feat(platform): ajouter suppression Instagram
fix(rate-limiter): corriger retry après 429
docs(readme): mettre à jour la liste des plateformes
chore(deps): mettre à jour expo SDK 52
refactor(queue): simplifier la logique SQLite
test(discord): ajouter tests unitaires client API
```

## Résoudre un conflit
```powershell
git fetch origin
git merge origin/develop
# Éditer les fichiers conflictuels
git add .
git commit -m "merge: resolve conflicts with develop"
```

## Tags de version
```powershell
git tag -a v1.0.0 -m "Release v1.0.0 - MVP Android"
git push origin v1.0.0
```

## Validation avant push
```powershell
npx tsc --noEmit    # TypeScript check
npx expo doctor     # Expo health check
git status          # Vérifier les fichiers
git diff --staged   # Review les changements
```

