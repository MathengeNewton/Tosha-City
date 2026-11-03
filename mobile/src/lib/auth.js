import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, loadSession, onSessionChange, saveSession, ApiError } from './api';
import { disablePush, enablePush } from './push';

const AuthContext = createContext(null);

const ALLOWED_ROLES = ['owner', 'admin'];

function roleNames(user) {
  return (user?.roles ?? []).map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSession()
      .then((s) => setUser(s.accessToken ? s.user : null))
      .finally(() => setReady(true));
    return onSessionChange((s) => setUser(s.accessToken ? s.user : null));
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await api.login(username.trim(), password);
    if (!roleNames(result.user).some((r) => ALLOWED_ROLES.includes(r))) {
      throw new ApiError('This app is for the business owner. Ask the admin to give your account the owner role.', 403);
    }
    await saveSession(result);
    enablePush().catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await disablePush();
    await clearSession();
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
