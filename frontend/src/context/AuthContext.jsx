import { createContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService.js';

export const AuthContext = createContext(null);

/**
 * Authentication context provider.
 * Manages user session state, initial bootstrap check, and login/register/logout actions.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check current session on mount
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const res = await authService.me();
        if (mounted) {
          setUser(res.user);
        }
      } catch {
        // A 401 simply means unauthenticated; keep user as null
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    // Listen for unauthorized events emitted by API client
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authService.register(data);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
