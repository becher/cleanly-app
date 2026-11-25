# 🚀 Cleanly — Roadmap des Fonctionnalités & Avantage Concurrentiel

Ce document détaille les fonctionnalités clés identifiées suite à l'analyse comparative des solutions du marché (**Redact.dev**, **Undiscord**, **Discrub**, **Unpost**, **TweetDelete**) et des retours de la communauté (Reddit, Trustpilot, GitHub).

---

## 🎯 Objectif Produit
Faire de **Cleanly** la référence mobile (Android & iOS) de nettoyage et d'hygiène numérique :
1. **Zéro trace, zéro log** (discrétion absolue, protection contre les bots de modération).
2. **100% sécurisé et transparent** (zéro spam promotionnel, sauvegarde locale chiffrée).
3. **Protection anti-ban maximale** (gestion stricte des rate limits HTTP 429 et temporisation adaptative).

---

## 📋 Tableau de Bord des Tâches (Backlog Priorisé)

| ID | Priorité | Fonctionnalité | Plateformes cibles | Statut |
|---|:---:|---|:---:|:---:|
| **FEAT-01** | 🔥 **P0 (Immédiat)** | **Mode Furtif (Anti-Surveillance & Logs)** : Anonymise et brouille le contenu avant suppression définitive pour préserver la vie privée face aux outils de surveillance et robots de salons de logs. | Discord, Reddit, Twitter | ✅ **Terminé (v1.1)** |
| **FEAT-02** | ⚡ **P1 (Élevée)** | **Filtre Données Sensibles (PII Shield)** : Détection en 1 clic des mots de passe, tokens, clés API, emails, IBAN et coordonnées personnelles. | Toutes plateformes | ✅ **Terminé (v1.2)** |
| **FEAT-03** | ⚡ **P1 (Élevée)** | **Fermeture automatique des DMs** : Supprime vos messages privés puis masque/ferme le fil de discussion de votre liste. | Discord, Teams | ✅ **Terminé (v1.2)** |
| **FEAT-04** | 🌟 **P2 (Moyenne)** | **Nettoyage des Réactions Emoji** : Retirer en masse les réactions laissées sur les messages d'autres utilisateurs. | Discord, Slack | ✅ **Terminé (v1.3)** |
| **FEAT-05** | 🌟 **P2 (Moyenne)** | **Import de Package de Données Officiel (ZIP/JSON)** : Contourne les limites des API pour supprimer l'historique complet depuis le 1er jour. | Discord, Twitter, Reddit | ⏳ Planifié |
| **FEAT-06** | 📅 **P3 (Évolution)** | **Auto-Clean Programmé (Règle de rétention)** : Tâche d'arrière-plan hebdomadaire ou mensuelle pour purger les messages anciens. | Multi-réseaux | ⏳ Planifié |

---

## 🛠️ Spécifications Détaillées des Fonctionnalités

### 1. FEAT-01 : Mode Furtif (Anti-Surveillance & Logs)
- **Objectif :** Empêcher les outils de surveillance automatisés et salons de modération d'archiver le contenu d'origine lors de l'événement de suppression.
- **Principe :**
  - Anonymiser le message en amont de la commande de suppression finale.
  - Résultat : Les outils tiers ne capturent aucune donnée personnelle lors de la suppression.
- **Option UI :** Interrupteur switchRow ou toggle dans le panneau d'options : `[👻 Mode Furtif (Anti-Logs)]`.

---

### 2. FEAT-02 : Filtre Données Sensibles (PII Shield)
- **Problème résolu :** L'utilisateur veut purger rapidement ses traces compromettantes sans supprimer toutes ses conversations amicales.
- **Filtres Regex automatiques :**
  - Clés d'API & Tokens : `(ghp_|discord\.gg|api[_-]?key|bearer|token|secret)`
  - Identifiants & Mots de passe : `(password|mdp|mot de passe|login|identifiant)`
  - Coordonnées personnelles : Emails, numéros de téléphone, IBAN / CB.

---

### 3. FEAT-03 : Fermeture & Masquage de DMs
- **Problème résolu :** Supprimer ses messages dans un DM laisse la conversation ouverte et visible dans la colonne de gauche.
- **Solution technique :** Appel de `DELETE /channels/{dmChannelId}` pour clore et masquer le salon de l'interface utilisateur.

---

### 4. FEAT-04 : Nettoyage des Réactions Emojis
- **Problème résolu :** Discord garde une trace de chaque réaction emoji posée sur les serveurs (`/channels/{cId}/messages/{mId}/reactions/{emoji}/@me`).
- **Solution technique :** Crawler les salons et supprimer les réactions posées par le compte.

---

### 5. FEAT-05 : Import d'Archive ZIP/JSON (Bypass limite API)
- **Problème résolu :** L'API Search Discord ignore souvent les messages de plus de 3-4 ans sur les gros serveurs.
- **Solution technique :** L'utilisateur télécharge son archive officielle Discord via les paramètres de confidentialité et Cleanly lit le fichier `messages.json` localement pour cibler 100% des messages sans passer par la recherche Discord.

---

*Document maintenu par l'équipe Cleanly App — Dernière mise à jour : 25 Novembre 2026*
