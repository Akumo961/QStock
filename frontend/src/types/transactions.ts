/**
 * Transaction Types
 * Type definitions for borrowing and return transaction data structures
 */

import { BaseEntity, Condition } from './index';
import { User, UserSummary } from './user';
import { Item, ItemSummary } from './item';

/**
 * Transaction Interface
 */
export interface Transaction extends BaseEntity {
  user_id: number;
  item_id: number;
  user_name: string;
  user_email: string;
  item_name: string;
  item_code: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  quantity: number;
  borrowed_at: string;
  due_date?: string;
  returned_at?: string;
  purpose?: string;
  notes?: string;
  condition_at_borrow: Condition;
  condition_at_return?: Condition;
  late_fee?: number;
  damage_fee?: number;
  total_fee?: number;
  approved_by?: number;
  processed_by?: number;
}

/**
 * Transaction types
 */
export type TransactionType = 'borrow' | 'return' | 'reservation' | 'transfer';

/**
 * Transaction status
 */
export type TransactionStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'overdue'
  | 'returned'
  | 'cancelled'
  | 'rejected';

/**
 * Borrow request
 */
export interface BorrowRequest {
  user_qr_code: string;
  item_qr_code: string;
  quantity: number;
  purpose?: string;
  notes?: string;
  due_days?: number;
  due_date?: string;
}

/**
 * Return request
 */
export interface ReturnRequest {
  transaction_id: number;
  condition_at_return?: Condition;
  notes?: string;
  has_damage?: boolean;
  damage_description?: string;
}

/**
 * Transaction filter
 */
export interface TransactionFilter {
  search?: string;
  user_id?: number;
  item_id?: number;
  status?: TransactionStatus | TransactionStatus[];
  transaction_type?: TransactionType;
  is_overdue?: boolean;
  borrowed_after?: string;
  borrowed_before?: string;
  returned_after?: string;
  returned_before?: string;
  due_after?: string;
  due_before?: string;
}

/**
 * Transaction list params
 */
export interface TransactionListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: TransactionSortField;
  sort_order?: 'asc' | 'desc';
  filters?: TransactionFilter;
}

/**
 * Transaction sort fields
 */
export type TransactionSortField =
  | 'borrowed_at'
  | 'due_date'
  | 'returned_at'
  | 'user_name'
  | 'item_name'
  | 'status'
  | 'quantity';

/**
 * Transaction detail view
 */
export interface TransactionDetail extends Transaction {
  user: UserSummary;
  item: ItemSummary;
  timeline: TransactionTimeline[];
  fees?: TransactionFee[];
  related_transactions?: TransactionSummary[];
}

/**
 * Transaction timeline
 */
export interface TransactionTimeline {
  id: number;
  transaction_id: number;
  event_type: TransactionEventType;
  description: string;
  performed_by?: number;
  user_name?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Transaction event types
 */
export type TransactionEventType =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'borrowed'
  | 'reminder_sent'
  | 'overdue'
  | 'returned'
  | 'extended'
  | 'cancelled'
  | 'fee_applied'
  | 'fee_waived';

/**
 * Transaction fee
 */
export interface TransactionFee {
  id: number;
  transaction_id: number;
  fee_type: FeeType;
  amount: number;
  description: string;
  status: FeeStatus;
  applied_at: string;
  waived_at?: string;
  waived_by?: number;
  waive_reason?: string;
}

/**
 * Fee types
 */
export type FeeType = 'late_fee' | 'damage_fee' | 'replacement_fee' | 'processing_fee';

/**
 * Fee status
 */
export type FeeStatus = 'pending' | 'paid' | 'waived' | 'cancelled';

/**
 * Transaction statistics
 */
export interface TransactionStats {
  total_transactions: number;
  active_borrows: number;
  overdue_borrows: number;
  total_returns: number;
  on_time_returns: number;
  late_returns: number;
  avg_borrow_duration: number;
  total_fees_collected: number;
  total_fees_waived: number;
}

/**
 * Transaction summary
 */
export interface TransactionSummary {
  id: number;
  user_name: string;
  item_name: string;
  status: TransactionStatus;
  borrowed_at: string;
  due_date?: string;
  is_overdue: boolean;
}

/**
 * Active borrow
 */
export interface ActiveBorrow extends Transaction {
  days_borrowed: number;
  days_until_due?: number;
  is_overdue: boolean;
  overdue_days?: number;
}

/**
 * Overdue transaction
 */
export interface OverdueTransaction extends Transaction {
  overdue_days: number;
  estimated_late_fee: number;
  reminder_count: number;
  last_reminder_sent?: string;
}

/**
 * Transaction extension request
 */
export interface ExtensionRequest {
  transaction_id: number;
  additional_days: number;
  reason?: string;
}

/**
 * Transaction extension
 */
export interface TransactionExtension {
  id: number;
  transaction_id: number;
  requested_by: number;
  additional_days: number;
  reason?: string;
  status: ExtensionStatus;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  new_due_date?: string;
  created_at: string;
}

/**
 * Extension status
 */
export type ExtensionStatus = 'pending' | 'approved' | 'rejected';

/**
 * Transaction reminder
 */
export interface TransactionReminder {
  id: number;
  transaction_id: number;
  reminder_type: ReminderType;
  sent_at: string;
  sent_to: string;
  method: NotificationMethod;
  status: ReminderStatus;
}

/**
 * Reminder types
 */
export type ReminderType =
  | 'due_soon'
  | 'due_today'
  | 'overdue'
  | 'final_notice';

/**
 * Notification methods
 */
export type NotificationMethod = 'email' | 'sms' | 'push' | 'in_app';

/**
 * Reminder status
 */
export type ReminderStatus = 'sent' | 'delivered' | 'failed' | 'bounced';

/**
 * Transaction report
 */
export interface TransactionReport {
  period: string;
  total_transactions: number;
  new_borrows: number;
  returns: number;
  active_borrows: number;
  overdue_count: number;
  on_time_return_rate: number;
  avg_borrow_duration: number;
  most_borrowed_items: ItemBorrowCount[];
  most_active_users: UserBorrowCount[];
  category_breakdown: CategoryBorrowCount[];
  daily_trend: DailyTransactionCount[];
}

/**
 * Item borrow count
 */
export interface ItemBorrowCount {
  item_id: number;
  item_name: string;
  item_code: string;
  borrow_count: number;
  unique_borrowers: number;
}

/**
 * User borrow count
 */
export interface UserBorrowCount {
  user_id: number;
  user_name: string;
  borrow_count: number;
  active_borrows: number;
  on_time_return_rate: number;
}

/**
 * Category borrow count
 */
export interface CategoryBorrowCount {
  category: string;
  borrow_count: number;
  return_count: number;
  active_count: number;
}

/**
 * Daily transaction count
 */
export interface DailyTransactionCount {
  date: string;
  borrow_count: number;
  return_count: number;
}

/**
 * Transaction export data
 */
export interface TransactionExportData {
  id: number;
  transaction_type: TransactionType;
  status: TransactionStatus;
  user_name: string;
  user_email: string;
  item_name: string;
  item_code: string;
  quantity: number;
  borrowed_at: string;
  due_date?: string;
  returned_at?: string;
  is_overdue: boolean;
  late_fee?: number;
  purpose?: string;
}

/**
 * Bulk transaction action
 */
export interface BulkTransactionAction {
  action: TransactionBulkActionType;
  transaction_ids: number[];
  data?: Record<string, any>;
}

/**
 * Transaction bulk action types
 */
export type TransactionBulkActionType =
  | 'approve'
  | 'reject'
  | 'send_reminder'
  | 'extend'
  | 'cancel'
  | 'waive_fees'
  | 'export';

/**
 * Transaction validation
 */
export interface TransactionValidation {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Checkout session
 */
export interface CheckoutSession {
  id: string;
  user_qr_scanned: boolean;
  item_qr_scanned: boolean;
  user_data?: string;
  item_data?: string;
  validated: boolean;
  expires_at: string;
  created_at: string;
}

/**
 * Return session
 */
export interface ReturnSession {
  id: string;
  transaction_id?: number;
  items_to_return: number[];
  condition_checks: ConditionCheck[];
  damage_reports: DamageReport[];
  completed: boolean;
  created_at: string;
}

/**
 * Condition check
 */
export interface ConditionCheck {
  item_id: number;
  condition: Condition;
  notes?: string;
  images?: string[];
  checked_by: number;
  checked_at: string;
}

/**
 * Damage report (during return)
 */
export interface DamageReport {
  item_id: number;
  damage_type: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  images?: string[];
  estimated_cost?: number;
  reported_by: number;
  reported_at: string;
}

/**
 * Transaction metrics
 */
export interface TransactionMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  total_borrows: number;
  total_returns: number;
  active_borrows: number;
  overdue_rate: number;
  on_time_rate: number;
  avg_duration_hours: number;
  peak_borrow_hour?: number;
  peak_borrow_day?: string;
}