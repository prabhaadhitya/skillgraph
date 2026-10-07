import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * Hook to access authentication context.
 *
 * @returns {{
 *   user: Object|null,
 *   isLoading: boolean,
 *   login: (credentials: Object) => Promise<Object>,
 *   register: (data: Object) => Promise<Object>,
 *   logout: () => Promise<void>,
 *   setUser: (user: Object|null) => void
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
