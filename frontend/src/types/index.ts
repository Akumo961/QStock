/**
 * Types Index
 * Central export point for all TypeScript types and interfaces
 */

// Re-export all types from individual modules
export * from './user';
export * from './item';
export * from './transactions';
export * from './review';

/**
 * Common/Shared Types
 */

// API Response wrapper
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// API Error
export interface ApiError {
  message: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// Sort options
export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

// Filter options
export interface FilterOption {
  field: string;
  value: any;
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
}

// Search params
export interface SearchParams {
  query?: string;
  page?: number;
  page_size?: number;
  sort?: SortOption;
  filters?: FilterOption[];
}

// Date range
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

// Select option (for dropdowns)
export interface SelectOption<T = any> {
  label: string;
  value: T;
  disabled?: boolean;
  icon?: React.ReactNode;
}

// Table column definition
export interface TableColumn<T = any> {
  id: string;
  label: string;
  field?: keyof T;
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
  format?: (value: any) => string;
}

// Form field
export interface FormField<T = any> {
  name: keyof T;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  validation?: ValidationRule[];
  helperText?: string;
}

// Validation rule
export interface ValidationRule {
  type: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

// Form errors
export type FormErrors<T = any> = {
  [K in keyof T]?: string;
};

// Upload file
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  data?: string | ArrayBuffer;
}

// Notification
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Theme
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
}

// Dashboard stats
export interface DashboardStats {
  total_users?: number;
  active_users?: number;
  total_items?: number;
  available_items?: number;
  borrowed_items?: number;
  total_transactions?: number;
  active_borrows?: number;
  overdue_borrows?: number;
  pending_requests?: number;
  total_returns?: number;
  maintenance_items?: number;
}

// Activity log
export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  activity_type: 'login' | 'logout' | 'borrow' | 'return' | 'create' | 'update' | 'delete';
  description: string;
  item_id?: number;
  item_name?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ip_address?: string;
}

// Chart data
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// Report
export interface Report {
  id: number;
  name: string;
  type: 'user_activity' | 'inventory_status' | 'transaction_history' | 'overdue_items' | 'usage_analytics';
  format: 'pdf' | 'excel' | 'csv';
  parameters: ReportParameters;
  created_by: number;
  created_at: string;
  file_url?: string;
}

export interface ReportParameters {
  start_date?: string;
  end_date?: string;
  category?: string;
  status?: string;
  user_id?: number;
  item_id?: number;
}

// Scheduled report
export interface ScheduledReport {
  id: number;
  report_type: Report['type'];
  format: Report['format'];
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  parameters: ReportParameters;
  next_run: string;
  is_active: boolean;
  created_at: string;
}

// QR Code
export interface QRCode {
  data: string;
  image: string;
  format: 'png' | 'svg';
  size: number;
}

// Settings
export interface Settings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  display: DisplaySettings;
}

export interface GeneralSettings {
  site_name: string;
  site_url: string;
  admin_email: string;
  timezone: string;
  language: string;
  date_format: string;
  time_format: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  due_date_reminders: boolean;
  overdue_alerts: boolean;
  new_items_alerts: boolean;
  reminder_days_before: number;
}

export interface SecuritySettings {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special: boolean;
  session_timeout: number;
  max_login_attempts: number;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  items_per_page: number;
  show_qr_codes: boolean;
  compact_mode: boolean;
}

// Permission
export type Permission =
  | 'read'
  | 'write'
  | 'delete'
  | 'admin'
  | 'borrow'
  | 'return'
  | 'manage_users'
  | 'manage_items'
  | 'view_reports'
  | 'manage_settings';

// Status
export type Status = 'active' | 'inactive' | 'pending' | 'archived';

// Priority
export type Priority = 'low' | 'medium' | 'high' | 'critical';

// Category (extend as needed)
export type Category =
  | 'Electronics'
  | 'Tools'
  | 'Equipment'
  | 'Furniture'
  | 'Supplies'
  | 'Books'
  | 'Sports'
  | 'Other';

// Condition
export type Condition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

// Issue severity
export type IssueSeverity = 'minor' | 'moderate' | 'severe';

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = number | string;
export type Timestamp = string | Date;

// Generic entity
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at?: string;
}

// Audit fields
export interface AuditFields {
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

// Search result
export interface SearchResult<T> {
  item: T;
  score: number;
  highlights?: string[];
}

// Breadcrumb
export interface Breadcrumb {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

// Route
export interface Route {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
  protected?: boolean;
  adminOnly?: boolean;
  title?: string;
}

// Menu item
export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  badge?: number | string;
  permission?: Permission;
  adminOnly?: boolean;
}

// Toast message
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Modal props
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
}

// Loading state
export interface LoadingState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

// HTTP Method
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request config
export interface RequestConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

// Environment
export type Environment = 'development' | 'staging' | 'production';

// Export utility type helpers
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OmitFields<T, K extends keyof T> = Omit<T, K>;

export type PickFields<T, K extends keyof T> = Pick<T, K>;
