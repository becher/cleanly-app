/**
 * Cleanly — Nettoyage intelligent de réseaux sociaux
 * Framework: React Native CLI pur (0.88.1)
 * Theme: Clean Light
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useRetentionStore } from './src/store/retentionStore';
import { retentionService } from './src/services/retentionService';

function App() {
  const loadAccounts = useAuthStore((s) => s.loadAccounts);

  useEffect(() => {
    loadAccounts();
    useRetentionStore
      .getState()
      .loadRules()
      .then(() => {
        retentionService.checkDueRetentionRules();
      })
      .catch(() => {});
  }, [loadAccounts]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
