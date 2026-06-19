/**
 * Application Constants
 * Centralized constants and configuration values
 */

// API Configuration
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

// Item Categories
export const ITEM_CATEGORIES = [
  'Electronics',
  'Tools',
  'Equipment',
  'Furniture',
  'Supplies',
  'Books',
  'Sports',
  'Other',
] as const;

// Item Status
export const ITEM_STATUS = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
} as const;

// Transaction Status
export const TRANSACTION_STATUS = {
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
} as const;

// Conditions
export const CONDITIONS = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  DAMAGED: 'damaged',
} as const;

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 10,
  BORROW_DAYS: 7,
  MAX_BORROW_DAYS: 30,
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SCANNER: '/scanner',
  INVENTORY: '/inventory',
  PROFILE: '/profile',
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    ITEMS: '/admin/items',
    REPORTS: '/admin/reports',
  },
} as const;

export type ItemCategory = typeof ITEM_CATEGORIES[number];