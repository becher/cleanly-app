// Layout racine de Cleanly
// Initialise : polices, DB SQLite, i18n, RTL (arabe)

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Init i18n (effet de bord — doit être importé tôt)
import '../src/i18n';
import i18n from '../src/i18n';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    // Initialiser SQLite (synchrone — pas de Promise)
    try {
      // Import dynamique pour éviter le crash sur Expo Go
      const { initDatabase } = require('../src/db/schema');
      initDatabase();
    } catch (e) {
      console.warn('[DB] expo-sqlite non disponible (Expo Go). Utilise un dev build.', e);
    }

    // RTL automatique pour l'arabe
    const isRTL = i18n.language === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
