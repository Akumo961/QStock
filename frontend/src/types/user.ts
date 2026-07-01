/**
 * User Types
 * Type definitions for user-related data structures
 */

import { BaseEntity, AuditFields, Permission } from './index';

/**
 * User Interface
 */
export interface User extends BaseEntity {
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  department?: string;
  phone?: string;
  employee_id?: string;
  position?: string;
  avatar_url?: string;
  qr_code_data?: string;
  qr_code_image?: string;
  last_login?: string;
  login_count?: number;
  preferences?: UserPreferences;
}

/**
 * User create/update data
 */
export interface UserFormData {
  email: string;
  full_name: string;
  password?: string;
  is_admin?: boolean;
  department?: string;
  phone?: string;
  employee_id?: string;
  position?: string;
  is_active?: boolean;
}

/**
 * User credentials
 */
export interface UserCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

/**
 * User registration data
 */
export interface UserRegistration {
  email: string;
  password: string;
  full_name: string;
  department?: string;
  phone?: string;
  employee_id?: string;
  terms_accepted: boolean;
}

/**
 * User profile update
 */
export interface UserProfileUpdate {
  full_name?: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  position?: string;
  avatar_url?: string;
}

/**
 * Password change
 */
export interface PasswordChange {
  new_password: string;
  confirm_password?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset
 */
export interface PasswordReset {
  token: string;
  new_password: string;
  confirm_password?: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es' | 'fr' | 'de';
  timezone: string;
  notifications: NotificationPreferences;
  display: DisplayPreferences;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email_notifications: boolean;
  due_date_reminders: boolean;
  overdue_alerts: boolean;
  new_items_alerts: boolean;
  system_updates: boolean;
  reminder_days_before: number;
}

/**
 * Display preferences
 */
export interface DisplayPreferences {
  items_per_page: number;
  compact_mode: boolean;
  show_avatars: boolean;
  show_qr_codes: boolean;
  default_view: 'grid' | 'list' | 'table';
}

/**
 * User statistics
 */
export interface UserStats {
  total_borrows: number;
  active_borrows: number;
  total_returns: number;
  overdue_count: number;
  on_time_returns: number;
  late_returns: number;
  favorite_category?: string;
  avg_borrow_duration?: number;
  total_reviews?: number;
  avg_rating_given?: number;
}

/**
 * User session
 */
export interface UserSession {
  id: string;
  user_id: number;
  token: string;
  refresh_token?: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  device?: string;
  last_activity: string;
}

/**
 * User activity
 */
export interface UserActivity {
  id: number;
  user_id: number;
  activity_type: UserActivityType;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

/**
 * User activity types
 */
export type UserActivityType =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'profile_update'
  | 'borrow'
  | 'return'
  | 'review'
  | 'search'
  | 'view_item'
  | 'download_qr'
  | 'settings_update';

/**
 * User role
 */
export interface UserRole {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
  is_system_role: boolean;
}

/**
 * User notification
 */
export interface UserNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

/**
 * Notification types
 */
export type NotificationType =
  | 'due_soon'
  | 'overdue'
  | 'item_returned'
  | 'item_available'
  | 'request_approved'
  | 'request_denied'
  | 'system_alert'
  | 'maintenance'
  | 'new_feature';

/**
 * User filter
 */
export interface UserFilter {
  search?: string;
  department?: string;
  is_active?: boolean;
  is_admin?: boolean;
  has_active_borrows?: boolean;
  has_overdue?: boolean;
  created_after?: string;
  created_before?: string;
}

/**
 * User list params
 */
export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: UserSortField;
  sort_order?: 'asc' | 'desc';
  filters?: UserFilter;
}

/**
 * User sort fields
 */
export type UserSortField =
  | 'full_name'
  | 'email'
  | 'department'
  | 'created_at'
  | 'last_login'
  | 'total_borrows';

/**
 * User status
 */
export interface UserStatus {
  is_active: boolean;
  is_verified: boolean;
  is_locked: boolean;
  suspension_reason?: string;
  suspension_until?: string;
}

/**
 * User verification
 */
export interface UserVerification {
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  verification_token?: string;
  verified_at?: string;
}

/**
 * User authentication response
 */
export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: 'Bearer';
  expires_in: number;
  user: User;
}

/**
 * User summary (minimal data)
 */
export interface UserSummary {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string;
  department?: string;
  is_admin: boolean;
}

/**
 * User search result
 */
export interface UserSearchResult {
  users: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * User export data
 */
export interface UserExportData {
  id: number;
  full_name: string;
  email: string;
  department?: string;
  employee_id?: string;
  phone?: string;
  is_active: boolean;
  is_admin: boolean;
  total_borrows: number;
  active_borrows: number;
  overdue_count: number;
  created_at: string;
  last_login?: string;
}

/**
 * User badge
 */
export interface UserBadge {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  criteria: string;
}

/**
 * User achievement
 */
export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_type: AchievementType;
  title: string;
  description: string;
  badge_icon?: string;
  earned_at: string;
  progress?: number;
  target?: number;
}

/**
 * Achievement types
 */
export type AchievementType =
  | 'first_borrow'
  | 'frequent_borrower'
  | 'on_time_returner'
  | 'early_returner'
  | 'category_expert'
  | 'reviewer'
  | 'helpful_feedback';

/**
 * User context (for React context)
 */
export interface UserContext {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissions: Permission[];
  login: (credentials: UserCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
  refreshUser: () => Promise<void>;
}