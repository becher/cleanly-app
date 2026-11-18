import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#5A5A70',
        tabBarStyle: {
          backgroundColor: '#13131A',
          borderTopColor: '#2A2A3A',
        },
        headerStyle: { backgroundColor: '#0A0A0F' },
        headerTintColor: '#F8F8FF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="networks"
        options={{
          title: 'Réseaux',
          tabBarIcon: ({ color }) => <TabBarIcon name="🌐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color }) => <TabBarIcon name="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color }) => <TabBarIcon name="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}

// color est un ColorValue RN (string | number | null | OpaqueColorValue)
function TabBarIcon({ name, color }: { name: string; color: ColorValue }) {
  return (
    <span style={{ fontSize: 20, color: color as string }}>{name}</span>
  );
}
