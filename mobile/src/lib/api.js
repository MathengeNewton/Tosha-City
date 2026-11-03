import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'https://apis.toshacity.co.ke/api'
).replace(/\/$/, '');

const KEYS = {
  access: 'toshacity-owner.access',
  refresh: 'toshacity-owner.refresh',
  user: 'toshacity-owner.user',
};

let session = { accessToken: null, refreshToken: null, user: null };
let refreshing = null;
const listeners = new Set();

export function onSessionChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((l) => l(session));
}

export async function loadSession() {
  const [accessToken, refreshToken, user] = await Promise.all([
    SecureStore.getItemAsync(KEYS.access),
    SecureStore.getItemAsync(KEYS.refresh),
    SecureStore.getItemAsync(KEYS.user),
  ]);
  session = { accessToken, refreshToken, user: user ? JSON.parse(user) : null };
  return session;
}

export async function saveSession({ access_token, refresh_token, user }) {
  session = { accessToken: access_token, refreshToken: refresh_token, user };
  await Promise.all([
    SecureStore.setItemAsync(KEYS.access, access_token),
    SecureStore.setItemAsync(KEYS.refresh, refresh_token),
    SecureStore.setItemAsync(KEYS.user, JSON.stringify(user)),
  ]);
  emit();
}

export async function clearSession() {
  session = { accessToken: null, refreshToken: null, user: null };
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
  emit();
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function parse(res) {
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join('\n') : body?.message;
    throw new ApiError(msg || `Request failed (${res.status})`, res.status);
  }
  return body;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function refreshTokens() {
  if (!session.refreshToken) throw new ApiError('Please log in again', 401);
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    })
      .then(parse)
      .then(saveSession)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function request(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && session.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No connection. Check your internet and try again.', 0);
  }

  if (res.status === 401 && auth && retry) {
    try {
      await refreshTokens();
    } catch {
      await clearSession();
      throw new ApiError('Your login has expired. Please log in again.', 401);
    }
    return request(path, { method, body, auth, retry: false });
  }
  return parse(res);
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  dailySummary: (date) => request(`/owner/daily-summary${date ? `?date=${date}` : ''}`),
  alerts: (from, to) => request(`/owner/alerts?from=${from}&to=${to}`),
  trends: (days) => request(`/owner/trends?days=${days}`),
  credit: () => request('/owner/credit'),
  registerDevice: (token, platform) =>
    request('/owner/devices', { method: 'POST', body: { token, platform } }),
  removeDevice: (token) => request(`/owner/devices/${encodeURIComponent(token)}`, { method: 'DELETE' }),
  testPush: () => request('/owner/devices/test', { method: 'POST' }),
};
