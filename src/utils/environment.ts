// Détecte l'environnement d'exécution
// Méthode fiable : vérifier si les modules natifs existent dans NativeModules

import { NativeModules } from 'react-native';

// Sur Expo Go : ExpoCrypto et ExpoSQLite ne sont PAS dans NativeModules
// Sur dev build / prod : ils sont présents
export const isExpoGo: boolean =
  !NativeModules.ExpoCrypto && !NativeModules.ExpoSQLite;

export const isDevBuild: boolean = !isExpoGo;

export function requireNativeFeature(featureName: string): boolean {
  if (isExpoGo) {
    console.warn(
      `[Cleanly] "${featureName}" nécessite un dev build.\n` +
      `Exécute : eas build --profile development`
    );
    return false;
  }
  return true;
}
