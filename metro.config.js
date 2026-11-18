// metro.config.js — Configuration Metro pour Cleanly
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. Autoriser les .wasm dans les assets (expo-sqlite web)
config.resolver.assetExts.push('wasm');

// 2. Exclure le worker web de expo-sqlite
config.resolver.blockList = [
  /expo-sqlite\/web\/worker\.ts$/,
];

// 3. Intercepter expo-crypto et tous ses sous-chemins → stub JS pur
//    Nécessaire car expo-auth-session import expo-crypto/build/ExpoCrypto (natif)
//    Sur Expo Go : ExpoCrypto natif n'existe pas → crash sans ce stub
const cryptoStub = path.resolve(__dirname, 'src/stubs/expo-crypto-stub.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Intercepter expo-crypto ET expo-crypto/build/xxx ET expo-crypto/build/ExpoCrypto
  if (
    moduleName === 'expo-crypto' ||
    moduleName.startsWith('expo-crypto/') ||
    moduleName.includes('ExpoCrypto')
  ) {
    return { filePath: cryptoStub, type: 'sourceFile' };
  }
  // Laisser Metro résoudre normalement
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
