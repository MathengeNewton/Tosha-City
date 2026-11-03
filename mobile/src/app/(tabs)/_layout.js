import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../lib/auth';
import { colors, Loading } from '../../components/ui';

const icon = (name) =>
  function TabIcon({ color, size }) {
    return <Ionicons name={name} color={color} size={size} />;
  };

export default function TabsLayout() {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('cash-outline') }} />
      <Tabs.Screen name="alerts" options={{ title: 'Warnings', tabBarIcon: icon('warning-outline') }} />
      <Tabs.Screen name="trends" options={{ title: 'Trends', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="credit" options={{ title: 'Owed', headerTitle: 'Who owes me', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
