import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../lib/auth';

function NotificationRouter() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const data = response?.notification?.request?.content?.data;
    if (!data?.screen) return;
    if (data.screen === 'alerts') router.navigate('/alerts');
    else if (data.screen === 'today') router.navigate({ pathname: '/', params: data.date ? { date: data.date } : {} });
    Notifications.clearLastNotificationResponseAsync();
  }, [response, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <NotificationRouter />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
