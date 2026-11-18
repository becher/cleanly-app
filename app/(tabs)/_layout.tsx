// Tab navigation — Clean Light theme
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';

export default function TabLayout() {
  // Inset bas = hauteur de la barre système (gestes Redmi, boutons Samsung...)
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   theme.accent.primary,
        tabBarInactiveTintColor: theme.text.muted,
        tabBarStyle: {
          backgroundColor: theme.bg.surface,
          borderTopColor:  theme.border.default,
          borderTopWidth:  1,
          // Hauteur dynamique selon l'inset système
          height: 56 + bottom,
          paddingBottom: bottom + 4,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: theme.bg.surface },
        headerTintColor: theme.text.primary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="networks"
        options={{
          title: 'Réseaux',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="share-social" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
