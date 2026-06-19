
import { authAPI } from './api';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  department?: string;
  phone?: string;
  employee_id?: string;
  qr_code_data?: string;
  qr_code_image?: string;
  created_at: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  department?: string;
  phone?: string;
  employee_id?: string;
}

interface AuthResponse {
  access_token: string;
  user: User;
}

class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly TOKEN_EXPIRY_KEY = 'token_expiry';

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await authAPI.login(credentials.email, credentials.password);
    this.setToken(response.access_token);
    this.setUser(response.user);
    const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await authAPI.register(data);
    this.setToken(response.access_token);
    this.setUser(response.user);
    const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
    return response;
  }

  /**
   * BUG 7 FIX: logout() only clears data. Navigation is done by useAuth.logout()
   * via React Router's navigate() — no hard reload, no window.location.
   */
  async logout(): Promise<void> {
    try {
      await authAPI.logout().catch(() => {
        // Token blacklisting endpoint is optional — ignore errors
      });
    } finally {
      this.clearAuthData();
      // NOTE: Do NOT call window.location.href here.
      // useAuth.logout() will call navigate('/login') after this resolves.
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await authAPI.me();
      this.setUser(user);
      return user;
    } catch {
      this.clearAuthData();
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const response = await authAPI.refreshToken();
      this.setToken(response.access_token);
      const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
      return response.access_token;
    } catch {
      this.clearAuthData();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    if (!token || !user) return false;
    if (this.isTokenExpired()) {
      this.clearAuthData();
      return false;
    }
    return true;
  }

  isTokenExpired(): boolean {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;
    return Date.now() > parseInt(expiryTime);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  updateUser(updates: Partial<User>): void {
    const currentUser = this.getUser();
    if (currentUser) {
      this.setUser({ ...currentUser, ...updates });
    }
  }

  clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  isAdmin(): boolean {
    return this.getUser()?.is_admin ?? false;
  }

  isActive(): boolean {
    return this.getUser()?.is_active ?? false;
  }

  getPermissions(): string[] {
    const user = this.getUser();
    if (!user) return [];
    const permissions: string[] = ['read'];
    if (user.is_admin) {
      permissions.push('admin', 'write', 'delete', 'manage_users', 'manage_items');
    } else {
      permissions.push('borrow', 'return');
    }
    return permissions;
  }

  hasPermission(permission: string): boolean {
    return this.getPermissions().includes(permission);
  }

  initAuthCheck(callback?: () => void): () => void {
    const interval = setInterval(() => {
      if (!this.isAuthenticated()) {
        this.clearAuthData();
        callback?.();
      } else if (this.shouldRefreshToken()) {
        this.refreshToken();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }

  private shouldRefreshToken(): boolean {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return false;
    return (parseInt(expiryTime) - Date.now()) < 30 * 60 * 1000;
  }

  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validatePassword(password: string): { valid: boolean; errors: string[]; strength: 'weak' | 'medium' | 'strong' } {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
    const strength: 'weak' | 'medium' | 'strong' = errors.length === 0 ? 'strong' : errors.length <= 2 ? 'medium' : 'weak';
    return { valid: errors.length === 0, errors, strength };
  }
}

const authService = new AuthService();
export default authService;
export type { User, LoginCredentials, RegisterData, AuthResponse };
