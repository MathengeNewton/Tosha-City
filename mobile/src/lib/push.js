import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const PUSH_TOKEN_KEY = 'toshacity-owner.push-token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Ask for permission, get this phone's Expo push token and register it with the backend.
 * Returns { ok, message }.
 */
export async function enablePush() {
  if (!Device.isDevice) return { ok: false, message: 'Push notifications need a real phone.' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Daily summary and warnings',
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D47A1',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    return { ok: false, message: 'Notifications are turned off for this app in phone settings.' };
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    return { ok: false, message: 'This build is not linked to an EAS project yet, so push is unavailable.' };
  }

  let token;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    return { ok: false, message: `Could not get a push token: ${e?.message ?? e}` };
  }
  await api.registerDevice(token, Platform.OS === 'ios' ? 'ios' : 'android');
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  return { ok: true, message: 'Notifications are on.' };
}

export async function disablePush() {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (token) {
    try {
      await api.removeDevice(token);
    } catch {
      // Still forget it locally; the backend drops dead tokens on the next send.
    }
  }
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

export async function isPushEnabled() {
  return !!(await SecureStore.getItemAsync(PUSH_TOKEN_KEY));
}
