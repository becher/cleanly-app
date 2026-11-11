#!/bin/bash
# setup.sh — Setup Cleanly App sur macOS / Linux
# Exécuter depuis la racine du projet : bash scripts/setup.sh

echo ""
echo "🧹 Cleanly App — Setup macOS/Linux"
echo ""

# 1. Vérifier Node.js
echo "🔍 Vérification Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trouvé. Installez-le depuis https://nodejs.org"
    exit 1
fi
echo "✅ $(node --version)"

# 2. Vérifier Git
if ! command -v git &> /dev/null; then
    echo "❌ Git non trouvé. Installez-le depuis https://git-scm.com"
    exit 1
fi
echo "✅ $(git --version)"

# 3. Installer les dépendances npm
echo ""
echo "📦 Installation des dépendances npm..."
npm install
echo "✅ Dépendances installées"

# 4. Installer les skills Antigravity
echo ""
echo "🤖 Installation des skills Antigravity..."
SKILLS_DEST="$HOME/.gemini/config/skills"
SKILLS_SRC="$(dirname "$0")/../.agents/skills"

if [ -d "$SKILLS_SRC" ]; then
    mkdir -p "$SKILLS_DEST"
    cp -r "$SKILLS_SRC"/. "$SKILLS_DEST/"
    echo "✅ Skills installées dans $SKILLS_DEST"
    for dir in "$SKILLS_DEST"/*/; do
        echo "   📚 $(basename "$dir")"
    done
else
    echo "⚠️  Dossier .agents/skills non trouvé"
fi

# 5. Copier les règles globales
echo ""
echo "📋 Configuration des règles Antigravity..."
RULES_SRC="$(dirname "$0")/../.agents/GEMINI.md"
if [ -f "$RULES_SRC" ]; then
    cp "$RULES_SRC" "$HOME/.gemini/config/GEMINI.md"
    echo "✅ Règles copiées"
fi

# 6. Vérifier Expo CLI
echo ""
echo "🔧 Vérification Expo CLI..."
if npx expo --version &> /dev/null; then
    echo "✅ Expo $(npx expo --version)"
else
    echo "⚠️  Installation Expo CLI..."
    npm install -g expo-cli eas-cli
fi

echo ""
echo "✅ Setup terminé ! Lancez l'app avec :"
echo "   npx expo start"
echo ""

