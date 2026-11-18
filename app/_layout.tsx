// Layout racine de Cleanly
// Initialise : polices, DB SQLite, i18n, RTL (arabe)

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import 'react-native-reanimated';

// Init i18n (effet de bord — doit être importé tôt)
import '../src/i18n';
import i18n from '../src/i18n';
import { initDatabase } from '../src/db/schema';

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
    try { initDatabase(); } catch (e) { console.error(e); }

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
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
