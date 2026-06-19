
import {
  useState, useEffect, useCallback,
  createContext, useContext, ReactNode,
} from 'react';
import authService, { User, LoginCredentials, RegisterData } from '../services/auth';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // BUG 4 FIX: Start as `true`. We don't know auth state until checkAuth resolves.
  // ProtectedRoute will show a loading spinner instead of redirecting immediately.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      authService.clearAuthData();
      navigate('/login', { replace: true });
    };

    const checkAuth = async () => {
      // BUG 4 FIX: Always set loading true before the async check.
      // The try/finally guarantees loading=false even if an exception occurs.
      setLoading(true);
      try {
        if (authService.isAuthenticated()) {
          // Token exists and hasn't expired client-side — verify with server
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } else {
          // No valid token — user is not authenticated
          setUser(null);
        }
      } catch {
        // Server rejected the token (401, network error, etc.)
        setUser(null);
        authService.clearAuthData();
      } finally {
        // BUG 4 FIX: Always clear loading, even on error
        setLoading(false);
      }
    };

    checkAuth();
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    // Periodic auth check — detect token expiry while app is open
    const cleanup = authService.initAuthCheck(() => {
      setUser(null);
      navigate('/login');
    });

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      cleanup();
    };
  }, [navigate]);

  /**
   * Login — calls authService which handles token storage,
   * then updates the React context with the returned user.
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  /**
   * Register — stores token and user, navigates to home
   */
  const register = useCallback(async (data: RegisterData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(data);
      setUser(response.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  /**
   * Logout — clears auth data then navigates (no hard reload).
   *
   * BUG 7 FIX: Was using window.location.href = '/login' which triggers a
   * full browser reload. Now uses navigate() for clean client-side transition.
   */
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      // BUG 7 FIX: client-side navigation, no hard reload
      navigate('/login', { replace: true });
    } catch (err: any) {
      // Even if logout API fails, clear local state
      setUser(null);
      authService.clearAuthData();
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      authService.updateUser(updates);
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh user data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user && authService.isAuthenticated(),
    isAdmin: user?.is_admin ?? false,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useRequireAuth = (redirectTo = '/login') => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !isAuthenticated) navigate(redirectTo);
  }, [isAuthenticated, loading, navigate, redirectTo]);
  return { isAuthenticated, loading };
};

export const useRequireAdmin = (redirectTo = '/') => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !isAdmin) navigate(redirectTo);
  }, [isAdmin, loading, navigate, redirectTo]);
  return { isAdmin, loading };
};

export const usePermission = (permission: string): boolean => {
  useAuth(); // ensure inside provider
  return authService.hasPermission(permission);
};

export const useAuthUser = () => {
  const { user, loading } = useAuth();
  return { user, loading };
};

export default useAuth;
