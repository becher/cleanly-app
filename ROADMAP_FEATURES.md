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
| **FEAT-01** | 🔥 **P0 (Immédiat)** | **Mode Furtif / Ghosting (Edit-before-Delete)** : Anonymise le message (`.`) avant suppression pour tromper les bots de logs de serveurs (*Carl-bot*, *Dyno*). | Discord, Reddit, Twitter | ✅ **Terminé (v1.1)** |
| **FEAT-02** | ⚡ **P1 (Élevée)** | **Filtre Données Sensibles (PII Shield)** : Détection en 1 clic des mots de passe, tokens, clés API, emails, IBAN et liens d'invitation. | Toutes plateformes | ⏳ Planifié |
| **FEAT-03** | ⚡ **P1 (Élevée)** | **Fermeture automatique des DMs** : Supprime vos messages privés puis masque/ferme le fil de discussion de votre liste. | Discord, Teams | ⏳ Planifié |
| **FEAT-04** | 🌟 **P2 (Moyenne)** | **Nettoyage des Réactions Emoji** : Retirer en masse les réactions laissées sur les messages d'autres utilisateurs. | Discord, Slack | ⏳ Planifié |
| **FEAT-05** | 🌟 **P2 (Moyenne)** | **Import de Package de Données Officiel (ZIP/JSON)** : Contourne les limites des API pour supprimer l'historique complet depuis le 1er jour. | Discord, Twitter, Reddit | ⏳ Planifié |
| **FEAT-06** | 📅 **P3 (Évolution)** | **Auto-Clean Programmé (Règle de rétention)** : Tâche d'arrière-plan hebdomadaire ou mensuelle pour purger les messages anciens. | Multi-réseaux | ⏳ Planifié |

---

## 🛠️ Spécifications Détaillées des Fonctionnalités

### 1. FEAT-01 : Mode Furtif / Ghosting (Anonymisation Anti-Logs)
- **Problème résolu :** Les bots de modération de serveurs Discord interceptent les événements `MESSAGE_DELETE` et postent dans les salons `#mod-logs` le contenu intégral du message effacé.
- **Solution technique :**
  - Avant l'appel `DELETE /channels/{cId}/messages/{mId}`, envoyer un `PATCH /channels/{cId}/messages/{mId}` avec `{ content: "." }`.
  - Attendre une micro-latence (100 ms).
  - Exécuter la suppression définitive `DELETE`.
  - Résultat : Les bots modérateurs enregistrent uniquement un point `.` ou du texte vide.
- **Option UI :** Interrupteur switchRow ou toggle dans le panneau d'options : `[👻 Mode Furtif (Ghosting Anti-Logs)]`.

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
