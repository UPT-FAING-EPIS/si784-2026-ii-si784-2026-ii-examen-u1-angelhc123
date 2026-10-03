import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onUnauthorized, tokenStore } from '../api/client';
import { authApi } from '../api/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const handleAuth = useCallback((auth) => {
    tokenStore.set(auth.token);
    setUser(auth.user);
    return auth.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isOrganizer: user?.role === 'Organizer' || user?.role === 'Admin',
      login: async (data) => handleAuth(await authApi.login(data)),
      register: async (data) => handleAuth(await authApi.register(data)),
      logout,
    }),
    [user, loading, handleAuth, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
