// metro.config.js — Configuration Metro pour Cleanly
// Fix 1 : expo-sqlite utilise des fichiers .wasm pour le web → on les exclut
// Fix 2 : alias expo-sqlite vers un stub quand le module natif n'est pas dispo

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Autoriser les .wasm dans les assets (sans les exécuter)
config.resolver.assetExts.push('wasm');

// Exclure le worker web de expo-sqlite
config.resolver.blockList = [
  /expo-sqlite\/web\/worker\.ts$/,
];

module.exports = config;
