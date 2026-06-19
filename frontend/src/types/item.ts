/**
 * Item Types
 * Type definitions for inventory item-related data structures
 */

import { BaseEntity, AuditFields, Category, Condition } from './index';

/**
 * Item Interface
 */
export interface Item extends BaseEntity {
  name: string;
  item_code: string;
  description?: string;
  category: Category;
  status: ItemStatus;
  quantity: number;
  available_quantity: number;
  is_borrowable: boolean;
  max_borrow_days?: number;
  serial_number?: string;
  brand?: string;
  model?: string;
  manufacturer?: string;
  location?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  warranty_expiry?: string;
  image_url?: string;
  images?: string[];
  qr_code_data?: string;
  qr_code_image?: string;
  tags?: string[];
  specifications?: ItemSpecification[];
  maintenance_schedule?: MaintenanceSchedule;
  last_maintained?: string;
  condition?: Condition;
  notes?: string;
}

/**
 * Item status
 */
export type ItemStatus =
  | 'available'
  | 'borrowed'
  | 'reserved'
  | 'maintenance'
  | 'damaged'
  | 'retired'
  | 'lost';

/**
 * Item form data
 */
export interface ItemFormData {
  name: string;
  item_code: string;
  description?: string;
  category: Category;
  quantity: number;
  is_borrowable: boolean;
  max_borrow_days?: number;
  serial_number?: string;
  brand?: string;
  model?: string;
  manufacturer?: string;
  location?: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_expiry?: string;
  image_url?: string;
  tags?: string[];
  condition?: Condition;
  notes?: string;
}

/**
 * Item specification
 */
export interface ItemSpecification {
  key: string;
  value: string;
  unit?: string;
}

/**
 * Item statistics
 */
export interface ItemStats {
  total_borrows: number;
  current_borrows: number;
  total_returns: number;
  avg_borrow_duration: number;
  popularity_rank?: number;
  avg_rating?: number;
  total_reviews?: number;
  utilization_rate: number;
  availability_rate: number;
  maintenance_count: number;
  issue_count: number;
}

/**
 * Item availability
 */
export interface ItemAvailability {
  item_id: number;
  is_available: boolean;
  available_quantity: number;
  total_quantity: number;
  next_available_date?: string;
  current_borrowers?: number[];
  reserved_by?: number[];
}

/**
 * Item filter
 */
export interface ItemFilter {
  search?: string;
  category?: Category | Category[];
  status?: ItemStatus | ItemStatus[];
  is_borrowable?: boolean;
  available_only?: boolean;
  location?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  tags?: string[];
  condition?: Condition;
  created_after?: string;
  created_before?: string;
}

/**
 * Item list params
 */
export interface ItemListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: ItemSortField;
  sort_order?: 'asc' | 'desc';
  filters?: ItemFilter;
}

/**
 * Item sort fields
 */
export type ItemSortField =
  | 'name'
  | 'item_code'
  | 'category'
  | 'status'
  | 'available_quantity'
  | 'created_at'
  | 'popularity'
  | 'rating';

/**
 * Item history entry
 */
export interface ItemHistory {
  id: number;
  item_id: number;
  action_type: ItemActionType;
  performed_by: number;
  user_name: string;
  description: string;
  previous_value?: any;
  new_value?: any;
  timestamp: string;
}

/**
 * Item action types
 */
export type ItemActionType =
  | 'created'
  | 'updated'
  | 'borrowed'
  | 'returned'
  | 'reserved'
  | 'maintenance_start'
  | 'maintenance_end'
  | 'damaged'
  | 'repaired'
  | 'retired'
  | 'reactivated';

/**
 * Item reservation
 */
export interface ItemReservation {
  id: number;
  item_id: number;
  user_id: number;
  quantity: number;
  reserved_from: string;
  reserved_until: string;
  status: ReservationStatus;
  purpose?: string;
  notes?: string;
  created_at: string;
}

/**
 * Reservation status
 */
export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'fulfilled'
  | 'cancelled'
  | 'expired';

/**
 * Maintenance schedule
 */
export interface MaintenanceSchedule {
  frequency: MaintenanceFrequency;
  last_maintenance?: string;
  next_maintenance?: string;
  maintenance_notes?: string;
}

/**
 * Maintenance frequency
 */
export type MaintenanceFrequency =
  | 'none'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

/**
 * Maintenance record
 */
export interface MaintenanceRecord {
  id: number;
  item_id: number;
  performed_by: number;
  maintenance_type: MaintenanceType;
  description: string;
  cost?: number;
  parts_replaced?: string[];
  next_maintenance_date?: string;
  performed_at: string;
}

/**
 * Maintenance types
 */
export type MaintenanceType =
  | 'routine'
  | 'repair'
  | 'inspection'
  | 'calibration'
  | 'cleaning'
  | 'upgrade';

/**
 * Item damage report
 */
export interface ItemDamageReport {
  id: number;
  item_id: number;
  reported_by: number;
  damage_type: DamageType;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  images?: string[];
  estimated_repair_cost?: number;
  repair_status: RepairStatus;
  reported_at: string;
  resolved_at?: string;
}

/**
 * Damage types
 */
export type DamageType =
  | 'physical'
  | 'functional'
  | 'cosmetic'
  | 'missing_parts'
  | 'water_damage'
  | 'electrical'
  | 'other';

/**
 * Repair status
 */
export type RepairStatus =
  | 'reported'
  | 'assessed'
  | 'in_repair'
  | 'repaired'
  | 'unrepairable'
  | 'parts_ordered';

/**
 * Item alert
 */
export interface ItemAlert {
  id: number;
  item_id: number;
  alert_type: ItemAlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  is_active: boolean;
  created_at: string;
  resolved_at?: string;
}

/**
 * Item alert types
 */
export type ItemAlertType =
  | 'low_stock'
  | 'out_of_stock'
  | 'maintenance_due'
  | 'warranty_expiring'
  | 'high_demand'
  | 'overdue'
  | 'damaged';

/**
 * Item search result
 */
export interface ItemSearchResult {
  items: Item[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  facets?: ItemFacets;
}

/**
 * Item facets (for filtering)
 */
export interface ItemFacets {
  categories: FacetCount[];
  statuses: FacetCount[];
  brands: FacetCount[];
  locations: FacetCount[];
  conditions: FacetCount[];
}

/**
 * Facet count
 */
export interface FacetCount {
  value: string;
  count: number;
}

/**
 * Item summary
 */
export interface ItemSummary {
  id: number;
  name: string;
  item_code: string;
  category: Category;
  status: ItemStatus;
  available_quantity: number;
  image_url?: string;
}

/**
 * Item detail view
 */
export interface ItemDetailView extends Item {
  stats: ItemStats;
  availability: ItemAvailability;
  current_borrowers: ItemBorrower[];
  recent_history: ItemHistory[];
  maintenance_records: MaintenanceRecord[];
  related_items?: ItemSummary[];
}

/**
 * Item borrower info
 */
export interface ItemBorrower {
  user_id: number;
  user_name: string;
  user_email: string;
  quantity: number;
  borrowed_at: string;
  due_date?: string;
  is_overdue: boolean;
}

/**
 * Item import data
 */
export interface ItemImportData {
  name: string;
  item_code: string;
  category: string;
  quantity: number;
  brand?: string;
  model?: string;
  location?: string;
  purchase_price?: number;
}

/**
 * Item export data
 */
export interface ItemExportData {
  id: number;
  name: string;
  item_code: string;
  category: Category;
  status: ItemStatus;
  quantity: number;
  available_quantity: number;
  brand?: string;
  model?: string;
  location?: string;
  purchase_price?: number;
  condition?: Condition;
  total_borrows: number;
  created_at: string;
}

/**
 * Item bulk action
 */
export interface ItemBulkAction {
  action: BulkActionType;
  item_ids: number[];
  data?: Record<string, any>;
}

/**
 * Bulk action types
 */
export type BulkActionType =
  | 'update_status'
  | 'update_location'
  | 'update_category'
  | 'retire'
  | 'delete'
  | 'export';

/**
 * Item category stats
 */
export interface CategoryStats {
  category: Category;
  total_items: number;
  available_items: number;
  borrowed_items: number;
  total_borrows: number;
  avg_rating: number;
  total_value: number;
}

/**
 * Popular item
 */
export interface PopularItem {
  item: ItemSummary;
  borrow_count: number;
  unique_borrowers: number;
  avg_rating?: number;
  rank: number;
}

/**
 * Item suggestion
 */
export interface ItemSuggestion {
  item: ItemSummary;
  reason: SuggestionReason;
  score: number;
}

/**
 * Suggestion reasons
 */
export type SuggestionReason =
  | 'frequently_borrowed'
  | 'highly_rated'
  | 'same_category'
  | 'similar_users'
  | 'trending'
  | 'new_arrival';

/**
 * Item QR code
 */
export interface ItemQRCode {
  item_id: number;
  qr_code_data: string;
  qr_code_image: string;
  download_url?: string;
}